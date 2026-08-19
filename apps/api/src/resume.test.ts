import {
  apiErrorSchema,
  resumeMaxFileSizeBytes,
  resumeResponseSchema,
  type CandidateResumeContent,
  type CandidateResumeData,
  type Profile,
  type Resume,
} from '@harap/contracts'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from './app.js'
import { AppError } from './lib/app-error.js'
import type {
  NewResumeRecord,
  ResumeRecord,
  ResumeRepository,
} from './repositories/resume.repository.js'
import type { ProfileRepository } from './repositories/profile.repository.js'
import type { AuthService } from './services/auth.service.js'
import type { PdfTextExtractor } from './services/pdf-text-extractor.js'
import type { ResumeCandidateParser } from './services/resume-candidate-parser.js'

const userAId = '60000000-0000-4000-8000-000000000001'
const userBId = '70000000-0000-4000-8000-000000000002'
const editableCandidate: CandidateResumeContent = {
  achievements: ['Improved a synthetic benchmark by 20%.'],
  education: [],
  experience: [],
  projects: [],
  skills: ['Systems thinking'],
  summary: 'Synthetic candidate context for an API test.',
  technologies: ['TypeScript'],
}
const analyzedCandidate: CandidateResumeData = {
  ...editableCandidate,
  roleAlignment: {
    gaps: [],
    level: 'strong',
    signals: ['Built and improved a TypeScript system.'],
    targetRole: 'Software Engineer',
  },
}

function createProfile(id: string): Profile {
  return {
    createdAt: '2026-08-10T00:00:00.000Z',
    displayName: 'Synthetic User',
    experienceLevel: 'career_shifter',
    id,
    interviewGoal: 'Prepare for software engineering interviews.',
    onboardingCompleted: true,
    preferredLanguage: 'typescript',
    targetRole: 'Software Engineer',
    updatedAt: '2026-08-10T00:00:00.000Z',
  }
}

function createResume(input: NewResumeRecord): ResumeRecord {
  const now = '2026-08-18T02:00:00.000Z'

  return {
    resume: {
      candidateData: null,
      confirmedAt: null,
      createdAt: now,
      failureCode: null,
      fileSizeBytes: input.fileSizeBytes,
      id: input.id,
      lastAnalyzedAt: null,
      originalFilename: input.originalFilename,
      status: 'uploaded',
      updatedAt: now,
    },
    storagePath: input.storagePath,
  }
}

describe('authenticated resume API', () => {
  const records = new Map<string, ResumeRecord>()
  const files = new Map<string, Uint8Array>()
  const authService: AuthService = {
    verifyAccessToken: vi.fn(async (token) => {
      if (token === 'valid-user-a') return { email: 'a@example.test', userId: userAId }
      if (token === 'valid-user-b') return { email: 'b@example.test', userId: userBId }
      throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Your session is invalid or has expired.')
    }),
  }
  const repository: ResumeRepository = {
    confirmCandidateData: vi.fn(async (auth, _token, candidateData) => {
      const current = records.get(auth.userId)
      if (current === undefined) throw new Error('missing synthetic record')
      const resume: Resume = {
        ...current.resume,
        candidateData,
        confirmedAt: '2026-08-18T03:00:00.000Z',
        failureCode: null,
        status: 'ready',
        updatedAt: '2026-08-18T03:00:00.000Z',
      }
      const next = { ...current, resume }
      records.set(auth.userId, next)
      return next
    }),
    deleteOwn: vi.fn(async (auth) => {
      records.delete(auth.userId)
    }),
    downloadSource: vi.fn(async (_token, storagePath) => {
      const contents = files.get(storagePath)
      if (contents === undefined) throw new Error('missing synthetic file')
      return contents
    }),
    findOwn: vi.fn(async (auth) => records.get(auth.userId) ?? null),
    markAnalysisFailed: vi.fn(async (auth, _token, failureCode) => {
      const current = records.get(auth.userId)
      if (current === undefined) throw new Error('missing synthetic record')
      const next: ResumeRecord = {
        ...current,
        resume: {
          ...current.resume,
          candidateData: null,
          failureCode,
          status: 'failed',
        },
      }
      records.set(auth.userId, next)
      return next
    }),
    markProcessing: vi.fn(async (auth) => {
      const current = records.get(auth.userId)
      if (current === undefined) throw new Error('missing synthetic record')
      const next: ResumeRecord = {
        ...current,
        resume: { ...current.resume, candidateData: null, failureCode: null, status: 'processing' },
      }
      records.set(auth.userId, next)
      return next
    }),
    markReviewRequired: vi.fn(async (auth, _token, candidateData) => {
      const current = records.get(auth.userId)
      if (current === undefined) throw new Error('missing synthetic record')
      const next: ResumeRecord = {
        ...current,
        resume: {
          ...current.resume,
          candidateData,
          failureCode: null,
          lastAnalyzedAt: '2026-08-18T03:00:00.000Z',
          status: 'review_required',
        },
      }
      records.set(auth.userId, next)
      return next
    }),
    removeSource: vi.fn(async (_token, storagePath) => {
      files.delete(storagePath)
    }),
    replaceOwn: vi.fn(async (auth, _token, input) => {
      const record = createResume(input)
      records.set(auth.userId, record)
      return record
    }),
    uploadSource: vi.fn(async (_token, storagePath, contents) => {
      files.set(storagePath, contents)
    }),
  }
  const pdfTextExtractor: PdfTextExtractor = {
    extract: vi.fn(async () => 'Synthetic resume text with enough content for a parser test.'),
  }
  const profileRepository: ProfileRepository = {
    findOrCreateOwn: vi.fn(async (auth) => createProfile(auth.userId)),
    updateOwn: vi.fn(async (auth) => createProfile(auth.userId)),
  }
  const candidateParser: ResumeCandidateParser = {
    parse: vi.fn(async () => analyzedCandidate),
  }
  const app = createApp({
    analysisRateLimitMax: 100,
    authService,
    candidateParser,
    pdfTextExtractor,
    profileRepository,
    resumeRepository: repository,
    uploadRateLimitMax: 100,
  })

  beforeEach(() => {
    records.clear()
    files.clear()
    vi.clearAllMocks()
    vi.mocked(candidateParser.parse).mockResolvedValue(analyzedCandidate)
  })

  it('requires a verified bearer token before processing multipart data', async () => {
    const missing = await request(app)
      .post('/api/v1/resume')
      .attach('resume', Buffer.from('%PDF-1.7 synthetic'), {
        contentType: 'application/pdf',
        filename: 'synthetic.pdf',
      })
      .expect(401)
    const invalid = await request(app)
      .post('/api/v1/resume')
      .set('Authorization', 'Bearer invalid-token')
      .attach('resume', Buffer.from('%PDF-1.7 synthetic'), {
        contentType: 'application/pdf',
        filename: 'synthetic.pdf',
      })
      .expect(401)

    expect(apiErrorSchema.parse(missing.body).error.code).toBe('AUTH_REQUIRED')
    expect(apiErrorSchema.parse(invalid.body).error.code).toBe('INVALID_ACCESS_TOKEN')
    expect(repository.uploadSource).not.toHaveBeenCalled()
  })

  it('rejects disguised and oversized files before persistence', async () => {
    const disguised = await request(app)
      .post('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .attach('resume', Buffer.from('not a pdf'), {
        contentType: 'application/pdf',
        filename: 'synthetic.pdf',
      })
      .expect(415)

    const oversized = await request(app)
      .post('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .attach('resume', Buffer.alloc(resumeMaxFileSizeBytes + 1, 1), {
        contentType: 'application/pdf',
        filename: 'synthetic.pdf',
      })
      .expect(413)

    expect(apiErrorSchema.parse(disguised.body).error.code).toBe('INVALID_RESUME_FILE')
    expect(apiErrorSchema.parse(oversized.body).error.code).toBe('RESUME_FILE_TOO_LARGE')
    expect(repository.uploadSource).not.toHaveBeenCalled()
  })

  it('uploads one private PDF without exposing ownership or storage fields', async () => {
    const response = await request(app)
      .post('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .attach('resume', Buffer.from('%PDF-1.7 synthetic'), {
        contentType: 'application/pdf',
        filename: '../Synthetic Resume.pdf',
      })
      .expect(201)
    const body = resumeResponseSchema.parse(response.body)
    const persisted = vi.mocked(repository.replaceOwn).mock.calls[0]?.[2]

    expect(body.data?.status).toBe('uploaded')
    expect(body.data?.originalFilename).not.toContain('..')
    expect(persisted?.storagePath).toMatch(new RegExp(`^${userAId}/[^/]+/source\\.pdf$`))
    expect(JSON.stringify(body)).not.toContain('storagePath')
    expect(JSON.stringify(body)).not.toContain(userAId)
  })

  it('returns only the resume derived from the verified token', async () => {
    records.set(
      userBId,
      createResume({
        contentSha256: 'b'.repeat(64),
        fileSizeBytes: 512,
        id: '71000000-0000-4000-8000-000000000002',
        originalFilename: 'user-b.pdf',
        storagePath: `${userBId}/71000000-0000-4000-8000-000000000002/source.pdf`,
      }),
    )

    const response = await request(app)
      .get('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .expect(200)

    expect(resumeResponseSchema.parse(response.body).data).toBeNull()
  })

  it('extracts and analyzes a stored PDF into reviewable candidate context', async () => {
    await request(app)
      .post('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .attach('resume', Buffer.from('%PDF-1.7 synthetic'), {
        contentType: 'application/pdf',
        filename: 'synthetic.pdf',
      })
      .expect(201)

    const response = await request(app)
      .post('/api/v1/resume/analyze')
      .set('Authorization', 'Bearer valid-user-a')
      .expect(200)
    const body = resumeResponseSchema.parse(response.body)

    expect(body.data?.status).toBe('review_required')
    expect(body.data?.candidateData).toEqual(analyzedCandidate)
    expect(pdfTextExtractor.extract).toHaveBeenCalledOnce()
    expect(profileRepository.findOrCreateOwn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: userAId }),
      'valid-user-a',
    )
    expect(candidateParser.parse).toHaveBeenCalledWith(
      'Synthetic resume text with enough content for a parser test.',
      'Software Engineer',
    )
  })

  it('persists a safe failure code when analysis is unavailable', async () => {
    await request(app)
      .post('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .attach('resume', Buffer.from('%PDF-1.7 synthetic'), {
        contentType: 'application/pdf',
        filename: 'synthetic.pdf',
      })
      .expect(201)
    vi.mocked(candidateParser.parse).mockRejectedValueOnce(
      new AppError(
        503,
        'RESUME_ANALYSIS_UNAVAILABLE',
        'Resume analysis is not configured. You can enter your details manually.',
      ),
    )

    const response = await request(app)
      .post('/api/v1/resume/analyze')
      .set('Authorization', 'Bearer valid-user-a')
      .expect(503)

    expect(apiErrorSchema.parse(response.body).error.code).toBe('RESUME_ANALYSIS_UNAVAILABLE')
    expect(repository.markAnalysisFailed).toHaveBeenCalledWith(
      expect.objectContaining({ userId: userAId }),
      'valid-user-a',
      'analysis_unavailable',
    )
    expect(records.get(userAId)?.resume.candidateData).toBeNull()
  })

  it('validates reviewed candidate data without accepting ownership fields', async () => {
    await request(app)
      .post('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .attach('resume', Buffer.from('%PDF-1.7 synthetic'), {
        contentType: 'application/pdf',
        filename: 'synthetic.pdf',
      })
      .expect(201)

    const invalid = await request(app)
      .patch('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .send({ candidateData: editableCandidate, userId: userBId })
      .expect(400)
    const forgedAlignment = await request(app)
      .patch('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .send({ candidateData: analyzedCandidate })
      .expect(400)
    const valid = await request(app)
      .patch('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .send({ candidateData: editableCandidate })
      .expect(200)

    expect(apiErrorSchema.parse(invalid.body).error.code).toBe('INVALID_REQUEST_BODY')
    expect(apiErrorSchema.parse(forgedAlignment.body).error.code).toBe('INVALID_REQUEST_BODY')
    expect(resumeResponseSchema.parse(valid.body).data?.status).toBe('ready')
    expect(resumeResponseSchema.parse(valid.body).data?.candidateData?.roleAlignment).toBeNull()
  })

  it('preserves server-assessed alignment when confirming edited candidate content', async () => {
    await request(app)
      .post('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .attach('resume', Buffer.from('%PDF-1.7 synthetic'), {
        contentType: 'application/pdf',
        filename: 'synthetic.pdf',
      })
      .expect(201)
    await request(app)
      .post('/api/v1/resume/analyze')
      .set('Authorization', 'Bearer valid-user-a')
      .expect(200)

    const response = await request(app)
      .patch('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .send({ candidateData: { ...editableCandidate, summary: 'Human-reviewed summary.' } })
      .expect(200)
    const confirmed = resumeResponseSchema.parse(response.body).data

    expect(confirmed?.candidateData?.summary).toBe('Human-reviewed summary.')
    expect(confirmed?.candidateData?.roleAlignment).toEqual(analyzedCandidate.roleAlignment)
  })

  it('clears old alignment on replacement and stores only the new analysis result', async () => {
    await request(app)
      .post('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .attach('resume', Buffer.from('%PDF-1.7 first'), {
        contentType: 'application/pdf',
        filename: 'first.pdf',
      })
      .expect(201)
    await request(app)
      .post('/api/v1/resume/analyze')
      .set('Authorization', 'Bearer valid-user-a')
      .expect(200)

    const replacement = await request(app)
      .post('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .attach('resume', Buffer.from('%PDF-1.7 second'), {
        contentType: 'application/pdf',
        filename: 'second.pdf',
      })
      .expect(201)
    expect(resumeResponseSchema.parse(replacement.body).data?.candidateData).toBeNull()

    const lowCandidate: CandidateResumeData = {
      ...analyzedCandidate,
      roleAlignment: {
        gaps: ['No software implementation evidence.'],
        level: 'low',
        signals: ['Documented controls and risk assessments.'],
        targetRole: 'Software Engineer',
      },
    }
    vi.mocked(candidateParser.parse).mockResolvedValueOnce(lowCandidate)
    const analyzedReplacement = await request(app)
      .post('/api/v1/resume/analyze')
      .set('Authorization', 'Bearer valid-user-a')
      .expect(200)

    expect(
      resumeResponseSchema.parse(analyzedReplacement.body).data?.candidateData?.roleAlignment,
    ).toEqual(lowCandidate.roleAlignment)
  })

  it('deletes the owned private file and record idempotently', async () => {
    await request(app)
      .post('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .attach('resume', Buffer.from('%PDF-1.7 synthetic'), {
        contentType: 'application/pdf',
        filename: 'synthetic.pdf',
      })
      .expect(201)

    await request(app)
      .delete('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .expect(204)
    await request(app)
      .delete('/api/v1/resume')
      .set('Authorization', 'Bearer valid-user-a')
      .expect(204)

    expect(records.has(userAId)).toBe(false)
    expect(files.size).toBe(0)
  })
})
