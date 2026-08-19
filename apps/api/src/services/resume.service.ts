import { createHash, randomUUID } from 'node:crypto'

import {
  candidateResumeDataSchema,
  resumeMaxFileSizeBytes,
  resumePdfMimeType,
  type CandidateResumeContent,
  type Resume,
  type ResumeFailureCode,
} from '@harap/contracts'

import { AppError } from '../lib/app-error.js'
import { logger } from '../lib/logger.js'
import type { ResumeRecord, ResumeRepository } from '../repositories/resume.repository.js'
import type { AuthContext } from '../types/auth.js'
import type { PdfTextExtractor } from './pdf-text-extractor.js'
import type { ProfileService } from './profile.service.js'
import type { ResumeCandidateParser } from './resume-candidate-parser.js'

export interface ResumeUpload {
  contents: Uint8Array
  mimeType: string
  originalFilename: string
}

function safeFilename(originalFilename: string): string {
  const sanitized = originalFilename
    .split('')
    .map((character) => {
      const code = character.charCodeAt(0)
      return code <= 31 || code === 127 || character === '/' || character === '\\' ? '_' : character
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255)

  return sanitized === '' ? 'resume.pdf' : sanitized
}

function isPdf(contents: Uint8Array): boolean {
  return contents.length >= 5 && new TextDecoder('ascii').decode(contents.slice(0, 5)) === '%PDF-'
}

function validateUpload(upload: ResumeUpload): ResumeUpload {
  const originalFilename = safeFilename(upload.originalFilename)

  if (
    upload.mimeType.toLocaleLowerCase() !== resumePdfMimeType ||
    !originalFilename.toLocaleLowerCase().endsWith('.pdf') ||
    !isPdf(upload.contents)
  ) {
    throw new AppError(415, 'INVALID_RESUME_FILE', 'Choose a valid PDF resume.')
  }

  if (upload.contents.length === 0 || upload.contents.length > resumeMaxFileSizeBytes) {
    throw new AppError(413, 'RESUME_FILE_TOO_LARGE', 'PDF resumes must be 5 MiB or smaller.')
  }

  return { ...upload, originalFilename }
}

function failureCodeFor(error: unknown): ResumeFailureCode {
  if (!(error instanceof AppError)) return 'analysis_failed'

  switch (error.code) {
    case 'EMPTY_PDF':
      return 'empty_pdf'
    case 'UNSUPPORTED_PDF':
      return 'unsupported_pdf'
    case 'PDF_EXTRACTION_FAILED':
      return 'extraction_failed'
    case 'RESUME_ANALYSIS_UNAVAILABLE':
      return 'analysis_unavailable'
    default:
      return 'analysis_failed'
  }
}

export class ResumeService {
  constructor(
    private readonly repository: ResumeRepository,
    private readonly pdfTextExtractor: PdfTextExtractor,
    private readonly candidateParser: ResumeCandidateParser,
    private readonly profileService: Pick<ProfileService, 'getProfile'>,
  ) {}

  async getResume(auth: AuthContext, accessToken: string): Promise<Resume | null> {
    const record = await this.repository.findOwn(auth, accessToken)
    return record?.resume ?? null
  }

  async uploadResume(
    auth: AuthContext,
    accessToken: string,
    rawUpload: ResumeUpload,
  ): Promise<Resume> {
    const upload = validateUpload(rawUpload)
    const previous = await this.repository.findOwn(auth, accessToken)
    const id = randomUUID()
    const storagePath = `${auth.userId}/${id}/source.pdf`
    const contentSha256 = createHash('sha256').update(upload.contents).digest('hex')

    await this.repository.uploadSource(accessToken, storagePath, upload.contents)

    let replacement: ResumeRecord
    try {
      replacement = await this.repository.replaceOwn(auth, accessToken, {
        contentSha256,
        fileSizeBytes: upload.contents.length,
        id,
        originalFilename: upload.originalFilename,
        storagePath,
      })
    } catch (error: unknown) {
      try {
        await this.repository.removeSource(accessToken, storagePath)
      } catch {
        logger.warn({ resumeId: id, userId: auth.userId }, 'Resume upload cleanup failed')
      }
      throw error
    }

    if (previous !== null && previous.storagePath !== storagePath) {
      try {
        await this.repository.removeSource(accessToken, previous.storagePath)
      } catch {
        logger.warn(
          { resumeId: previous.resume.id, userId: auth.userId },
          'Replaced resume cleanup failed',
        )
      }
    }

    logger.info({ resumeId: replacement.resume.id, userId: auth.userId }, 'Resume uploaded')
    return replacement.resume
  }

  async analyzeResume(auth: AuthContext, accessToken: string): Promise<Resume> {
    const current = await this.repository.findOwn(auth, accessToken)

    if (current === null) {
      throw new AppError(404, 'RESUME_NOT_FOUND', 'Upload a PDF resume first.')
    }

    const profile = await this.profileService.getProfile(auth, accessToken)
    await this.repository.markProcessing(auth, accessToken)

    try {
      const contents = await this.repository.downloadSource(accessToken, current.storagePath)
      if (!isPdf(contents)) {
        throw new AppError(422, 'UNSUPPORTED_PDF', 'The stored file is not a supported PDF.')
      }

      const resumeText = await this.pdfTextExtractor.extract(contents)
      const candidateData = await this.candidateParser.parse(resumeText, profile.targetRole)
      const analyzed = await this.repository.markReviewRequired(auth, accessToken, candidateData)

      logger.info({ resumeId: analyzed.resume.id, userId: auth.userId }, 'Resume analyzed')
      return analyzed.resume
    } catch (error: unknown) {
      const failureCode = failureCodeFor(error)
      try {
        await this.repository.markAnalysisFailed(auth, accessToken, failureCode)
      } catch {
        logger.warn(
          { resumeId: current.resume.id, userId: auth.userId },
          'Resume failure state could not be saved',
        )
      }

      if (error instanceof AppError) throw error
      throw new AppError(
        503,
        'RESUME_ANALYSIS_FAILED',
        'Resume analysis is temporarily unavailable. You can enter your details manually.',
      )
    }
  }

  async confirmCandidateData(
    auth: AuthContext,
    accessToken: string,
    candidateData: CandidateResumeContent,
  ): Promise<Resume> {
    const current = await this.repository.findOwn(auth, accessToken)
    if (current === null) {
      throw new AppError(404, 'RESUME_NOT_FOUND', 'Upload a PDF resume first.')
    }

    const confirmedCandidateData = candidateResumeDataSchema.parse({
      ...candidateData,
      roleAlignment: current.resume.candidateData?.roleAlignment ?? null,
    })
    const confirmed = await this.repository.confirmCandidateData(
      auth,
      accessToken,
      confirmedCandidateData,
    )
    logger.info({ resumeId: confirmed.resume.id, userId: auth.userId }, 'Resume context confirmed')
    return confirmed.resume
  }

  async deleteResume(auth: AuthContext, accessToken: string): Promise<void> {
    const current = await this.repository.findOwn(auth, accessToken)
    if (current === null) return

    await this.repository.removeSource(accessToken, current.storagePath)
    await this.repository.deleteOwn(auth, accessToken)
    logger.info({ resumeId: current.resume.id, userId: auth.userId }, 'Resume deleted')
  }
}
