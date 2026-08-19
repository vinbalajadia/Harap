import {
  candidateResumeDataSchema,
  resumeFailureCodeSchema,
  resumeSchema,
  resumeStatusSchema,
  type CandidateResumeData,
  type Resume,
  type ResumeFailureCode,
} from '@harap/contracts'

import { AppError } from '../lib/app-error.js'
import { logger } from '../lib/logger.js'
import { createUserScopedSupabaseClient } from '../lib/supabase/client.js'
import type { AuthContext } from '../types/auth.js'
import type { Database, Json } from '../types/database.js'

const resumeBucket = 'resumes'
const resumeColumns =
  'id, user_id, original_filename, storage_path, file_size_bytes, content_sha256, status, candidate_data, failure_code, confirmed_at, last_analyzed_at, created_at, updated_at'

type ResumeRow = Database['public']['Tables']['resumes']['Row']

export interface ResumeRecord {
  resume: Resume
  storagePath: string
}

export interface NewResumeRecord {
  contentSha256: string
  fileSizeBytes: number
  id: string
  originalFilename: string
  storagePath: string
}

export interface ResumeRepository {
  deleteOwn(auth: AuthContext, accessToken: string): Promise<void>
  downloadSource(accessToken: string, storagePath: string): Promise<Uint8Array>
  findOwn(auth: AuthContext, accessToken: string): Promise<ResumeRecord | null>
  markAnalysisFailed(
    auth: AuthContext,
    accessToken: string,
    failureCode: ResumeFailureCode,
  ): Promise<ResumeRecord>
  markProcessing(auth: AuthContext, accessToken: string): Promise<ResumeRecord>
  markReviewRequired(
    auth: AuthContext,
    accessToken: string,
    candidateData: CandidateResumeData,
  ): Promise<ResumeRecord>
  confirmCandidateData(
    auth: AuthContext,
    accessToken: string,
    candidateData: CandidateResumeData,
  ): Promise<ResumeRecord>
  removeSource(accessToken: string, storagePath: string): Promise<void>
  replaceOwn(auth: AuthContext, accessToken: string, record: NewResumeRecord): Promise<ResumeRecord>
  uploadSource(accessToken: string, storagePath: string, contents: Uint8Array): Promise<void>
}

function toResumeRecord(row: ResumeRow): ResumeRecord {
  return {
    resume: resumeSchema.parse({
      candidateData:
        row.candidate_data === null ? null : candidateResumeDataSchema.parse(row.candidate_data),
      confirmedAt: row.confirmed_at,
      createdAt: row.created_at,
      failureCode:
        row.failure_code === null ? null : resumeFailureCodeSchema.parse(row.failure_code),
      fileSizeBytes: row.file_size_bytes,
      id: row.id,
      lastAnalyzedAt: row.last_analyzed_at,
      originalFilename: row.original_filename,
      status: resumeStatusSchema.parse(row.status),
      updatedAt: row.updated_at,
    }),
    storagePath: row.storage_path,
  }
}

function candidateJson(candidateData: CandidateResumeData): Json {
  return JSON.parse(JSON.stringify(candidateData)) as Json
}

function logSupabaseFailure(operation: string, error: unknown): void {
  const metadata: { code?: string; statusCode?: number | string } = {}

  if (typeof error === 'object' && error !== null) {
    if ('code' in error && typeof error.code === 'string') metadata.code = error.code
    if (
      'statusCode' in error &&
      (typeof error.statusCode === 'number' || typeof error.statusCode === 'string')
    ) {
      metadata.statusCode = error.statusCode
    }
  }

  logger.warn({ operation, ...metadata }, 'Supabase resume operation failed')
}

export class SupabaseResumeRepository implements ResumeRepository {
  async findOwn(auth: AuthContext, accessToken: string): Promise<ResumeRecord | null> {
    const client = createUserScopedSupabaseClient(accessToken)
    const { data, error } = await client
      .from('resumes')
      .select(resumeColumns)
      .eq('user_id', auth.userId)
      .maybeSingle()

    if (error !== null) {
      throw new AppError(503, 'RESUME_UNAVAILABLE', 'Your resume is temporarily unavailable.')
    }

    return data === null ? null : toResumeRecord(data)
  }

  async uploadSource(
    accessToken: string,
    storagePath: string,
    contents: Uint8Array,
  ): Promise<void> {
    const client = createUserScopedSupabaseClient(accessToken)
    const { error } = await client.storage.from(resumeBucket).upload(storagePath, contents, {
      cacheControl: '3600',
      contentType: 'application/pdf',
      upsert: false,
    })

    if (error !== null) {
      logSupabaseFailure('storage.upload', error)
      throw new AppError(503, 'RESUME_UPLOAD_FAILED', 'Your resume could not be uploaded.')
    }
  }

  async downloadSource(accessToken: string, storagePath: string): Promise<Uint8Array> {
    const client = createUserScopedSupabaseClient(accessToken)
    const { data, error } = await client.storage.from(resumeBucket).download(storagePath)

    if (error !== null) {
      throw new AppError(503, 'RESUME_SOURCE_UNAVAILABLE', 'Your resume file is unavailable.')
    }

    return new Uint8Array(await data.arrayBuffer())
  }

  async removeSource(accessToken: string, storagePath: string): Promise<void> {
    const client = createUserScopedSupabaseClient(accessToken)
    const { error } = await client.storage.from(resumeBucket).remove([storagePath])

    if (error !== null) {
      throw new AppError(503, 'RESUME_DELETE_FAILED', 'Your resume could not be removed.')
    }
  }

  async replaceOwn(
    auth: AuthContext,
    accessToken: string,
    record: NewResumeRecord,
  ): Promise<ResumeRecord> {
    const client = createUserScopedSupabaseClient(accessToken)
    const replacement: Database['public']['Tables']['resumes']['Update'] = {
      candidate_data: null,
      confirmed_at: null,
      content_sha256: record.contentSha256,
      failure_code: null,
      file_size_bytes: record.fileSizeBytes,
      id: record.id,
      last_analyzed_at: null,
      original_filename: record.originalFilename,
      status: 'uploaded',
      storage_path: record.storagePath,
    }
    const { data: replaced, error: replaceError } = await client
      .from('resumes')
      .update(replacement)
      .eq('user_id', auth.userId)
      .select(resumeColumns)
      .maybeSingle()

    if (replaceError !== null) {
      logSupabaseFailure('database.replace', replaceError)
      throw new AppError(503, 'RESUME_UPLOAD_FAILED', 'Your resume could not be uploaded.')
    }

    if (replaced !== null) return toResumeRecord(replaced)

    // Lifecycle columns intentionally have no INSERT grant. Their database defaults are null.
    const initial: Database['public']['Tables']['resumes']['Insert'] = {
      content_sha256: record.contentSha256,
      file_size_bytes: record.fileSizeBytes,
      id: record.id,
      original_filename: record.originalFilename,
      status: 'uploaded',
      storage_path: record.storagePath,
      user_id: auth.userId,
    }
    const { data: inserted, error: insertError } = await client
      .from('resumes')
      .insert(initial)
      .select(resumeColumns)
      .single()

    if (insertError !== null) {
      logSupabaseFailure('database.insert', insertError)
      throw new AppError(503, 'RESUME_UPLOAD_FAILED', 'Your resume could not be uploaded.')
    }

    return toResumeRecord(inserted)
  }

  async markProcessing(auth: AuthContext, accessToken: string): Promise<ResumeRecord> {
    return this.updateOwn(auth, accessToken, {
      candidate_data: null,
      confirmed_at: null,
      failure_code: null,
      status: 'processing',
    })
  }

  async markReviewRequired(
    auth: AuthContext,
    accessToken: string,
    candidateData: CandidateResumeData,
  ): Promise<ResumeRecord> {
    return this.updateOwn(auth, accessToken, {
      candidate_data: candidateJson(candidateData),
      confirmed_at: null,
      failure_code: null,
      last_analyzed_at: new Date().toISOString(),
      status: 'review_required',
    })
  }

  async markAnalysisFailed(
    auth: AuthContext,
    accessToken: string,
    failureCode: ResumeFailureCode,
  ): Promise<ResumeRecord> {
    return this.updateOwn(auth, accessToken, {
      candidate_data: null,
      confirmed_at: null,
      failure_code: failureCode,
      last_analyzed_at: new Date().toISOString(),
      status: 'failed',
    })
  }

  async confirmCandidateData(
    auth: AuthContext,
    accessToken: string,
    candidateData: CandidateResumeData,
  ): Promise<ResumeRecord> {
    return this.updateOwn(auth, accessToken, {
      candidate_data: candidateJson(candidateData),
      confirmed_at: new Date().toISOString(),
      failure_code: null,
      status: 'ready',
    })
  }

  async deleteOwn(auth: AuthContext, accessToken: string): Promise<void> {
    const client = createUserScopedSupabaseClient(accessToken)
    const { error } = await client.from('resumes').delete().eq('user_id', auth.userId)

    if (error !== null) {
      throw new AppError(503, 'RESUME_DELETE_FAILED', 'Your resume could not be removed.')
    }
  }

  private async updateOwn(
    auth: AuthContext,
    accessToken: string,
    update: Database['public']['Tables']['resumes']['Update'],
  ): Promise<ResumeRecord> {
    const client = createUserScopedSupabaseClient(accessToken)
    const { data, error } = await client
      .from('resumes')
      .update(update)
      .eq('user_id', auth.userId)
      .select(resumeColumns)
      .single()

    if (error !== null) {
      throw new AppError(503, 'RESUME_UPDATE_FAILED', 'Your resume could not be updated.')
    }

    return toResumeRecord(data)
  }
}
