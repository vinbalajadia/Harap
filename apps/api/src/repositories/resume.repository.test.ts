import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMocks = vi.hoisted(() => ({
  createUserScopedSupabaseClient: vi.fn(),
}))

vi.mock('../lib/supabase/client.js', () => ({
  createUserScopedSupabaseClient: supabaseMocks.createUserScopedSupabaseClient,
}))

import type { Database } from '../types/database.js'
import { SupabaseResumeRepository, type NewResumeRecord } from './resume.repository.js'

const userId = '60000000-0000-4000-8000-000000000001'
const resumeId = '61000000-0000-4000-8000-000000000001'
const accessToken = 'verified-user-access-token'
const record: NewResumeRecord = {
  contentSha256: 'a'.repeat(64),
  fileSizeBytes: 2048,
  id: resumeId,
  originalFilename: 'synthetic-resume.pdf',
  storagePath: `${userId}/${resumeId}/source.pdf`,
}

function resumeRow() {
  return {
    candidate_data: null,
    confirmed_at: null,
    content_sha256: record.contentSha256,
    created_at: '2026-08-18T00:00:00.000Z',
    failure_code: null,
    file_size_bytes: record.fileSizeBytes,
    id: record.id,
    last_analyzed_at: null,
    original_filename: record.originalFilename,
    status: 'uploaded',
    storage_path: record.storagePath,
    updated_at: '2026-08-18T00:00:00.000Z',
    user_id: userId,
  }
}

function createDatabaseClient(existingRow: ReturnType<typeof resumeRow> | null) {
  const updateChain = {
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: existingRow, error: null })),
    select: vi.fn(),
  }
  updateChain.eq.mockReturnValue(updateChain)
  updateChain.select.mockReturnValue(updateChain)

  const insertChain = {
    select: vi.fn(),
    single: vi.fn(async () => ({ data: resumeRow(), error: null })),
  }
  insertChain.select.mockReturnValue(insertChain)

  const table = {
    insert: vi.fn<
      (payload: Database['public']['Tables']['resumes']['Insert']) => typeof insertChain
    >(() => insertChain),
    update: vi.fn(() => updateChain),
  }
  const client = { from: vi.fn(() => table) }
  supabaseMocks.createUserScopedSupabaseClient.mockReturnValue(client)

  return { client, insertChain, table, updateChain }
}

describe('Supabase resume repository replacement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initially inserts only columns granted to the authenticated role', async () => {
    const { table } = createDatabaseClient(null)
    const repository = new SupabaseResumeRepository()

    const result = await repository.replaceOwn(
      { email: 'synthetic@example.test', userId },
      accessToken,
      record,
    )

    expect(supabaseMocks.createUserScopedSupabaseClient).toHaveBeenCalledWith(accessToken)
    expect(table.insert).toHaveBeenCalledWith({
      content_sha256: record.contentSha256,
      file_size_bytes: record.fileSizeBytes,
      id: record.id,
      original_filename: record.originalFilename,
      status: 'uploaded',
      storage_path: record.storagePath,
      user_id: userId,
    })
    const insertPayload = vi.mocked(table.insert).mock.calls[0]?.[0]
    expect(insertPayload).not.toHaveProperty('candidate_data')
    expect(insertPayload).not.toHaveProperty('confirmed_at')
    expect(insertPayload).not.toHaveProperty('failure_code')
    expect(insertPayload).not.toHaveProperty('last_analyzed_at')
    expect(result.resume.status).toBe('uploaded')
  })

  it('resets lifecycle columns through the update grant when replacing an existing resume', async () => {
    const { table } = createDatabaseClient(resumeRow())
    const repository = new SupabaseResumeRepository()

    await repository.replaceOwn({ email: 'synthetic@example.test', userId }, accessToken, record)

    expect(table.update).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate_data: null,
        confirmed_at: null,
        failure_code: null,
        id: resumeId,
        last_analyzed_at: null,
        status: 'uploaded',
      }),
    )
    expect(table.insert).not.toHaveBeenCalled()
  })
})

describe('toResumeRecord database timestamp boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('converts a real Supabase offset-aware timestamp (+00:00) to a valid domain record', async () => {
    // PostgreSQL timestamptz returns '+00:00' notation, not 'Z'.
    // toResumeRecord must accept this without throwing a ZodError.
    const offsetRow = {
      candidate_data: null,
      confirmed_at: null,
      content_sha256: record.contentSha256,
      created_at: '2026-08-18T10:58:54.123+00:00',
      failure_code: null,
      file_size_bytes: record.fileSizeBytes,
      id: record.id,
      last_analyzed_at: null,
      original_filename: record.originalFilename,
      status: 'uploaded',
      storage_path: record.storagePath,
      updated_at: '2026-08-18T10:58:54.456+00:00',
      user_id: userId,
    }

    const insertChain = {
      select: vi.fn(),
      single: vi.fn(async () => ({ data: offsetRow, error: null })),
    }
    insertChain.select.mockReturnValue(insertChain)

    const updateChain = {
      eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      select: vi.fn(),
    }
    updateChain.eq.mockReturnValue(updateChain)
    updateChain.select.mockReturnValue(updateChain)

    const table = {
      insert: vi.fn<
        (payload: Database['public']['Tables']['resumes']['Insert']) => typeof insertChain
      >(() => insertChain),
      update: vi.fn(() => updateChain),
    }
    const client = { from: vi.fn(() => table) }
    supabaseMocks.createUserScopedSupabaseClient.mockReturnValue(client)

    const repository = new SupabaseResumeRepository()
    const result = await repository.replaceOwn(
      { email: 'synthetic@example.test', userId },
      accessToken,
      record,
    )

    // The domain timestamp must preserve the UTC instant; both notations are equivalent.
    expect(result.resume.createdAt).toBe('2026-08-18T10:58:54.123+00:00')
    expect(result.resume.updatedAt).toBe('2026-08-18T10:58:54.456+00:00')
    expect(result.resume.status).toBe('uploaded')
  })

  it('reads legacy candidate JSON without role alignment as not assessed', async () => {
    const legacyRow = {
      ...resumeRow(),
      candidate_data: {
        achievements: [],
        education: [],
        experience: [],
        projects: [],
        skills: ['Risk assessment'],
        summary: 'Legacy candidate data stored before alignment existed.',
        technologies: [],
      },
      last_analyzed_at: '2026-08-18T01:00:00.000Z',
      status: 'review_required',
    }
    const queryChain = {
      eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: legacyRow, error: null })),
      select: vi.fn(),
    }
    queryChain.select.mockReturnValue(queryChain)
    queryChain.eq.mockReturnValue(queryChain)
    supabaseMocks.createUserScopedSupabaseClient.mockReturnValue({
      from: vi.fn(() => queryChain),
    })
    const repository = new SupabaseResumeRepository()

    const result = await repository.findOwn(
      { email: 'synthetic@example.test', userId },
      accessToken,
    )

    expect(result?.resume.candidateData?.roleAlignment).toBeNull()
    expect(result?.resume.candidateData?.summary).toContain('Legacy candidate data')
  })
})
