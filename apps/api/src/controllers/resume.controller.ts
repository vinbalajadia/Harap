import {
  resumeResponseSchema,
  resumeUpdateSchema,
  type Resume,
  type ResumeResponse,
} from '@harap/contracts'
import type { Request, Response } from 'express'

import { getRequestId } from '../lib/api-response.js'
import { AppError } from '../lib/app-error.js'
import type { ResumeService } from '../services/resume.service.js'

function requireAuth(request: Request) {
  if (request.auth === undefined) {
    throw new AppError(500, 'AUTH_CONTEXT_MISSING', 'An unexpected error occurred.')
  }

  return request.auth
}

function requireAccessToken(response: Response): string {
  if (response.locals.accessToken === undefined) {
    throw new AppError(500, 'AUTH_CONTEXT_MISSING', 'An unexpected error occurred.')
  }

  return response.locals.accessToken
}

function sendResume(
  response: Response<ResumeResponse>,
  resume: Resume | null,
  statusCode = 200,
): void {
  response.status(statusCode).json(
    resumeResponseSchema.parse({
      data: resume,
      meta: { requestId: getRequestId(response) },
    }),
  )
}

export function createResumeController(resumeService: ResumeService) {
  return {
    analyzeResume: async (request: Request, response: Response<ResumeResponse>): Promise<void> => {
      const resume = await resumeService.analyzeResume(
        requireAuth(request),
        requireAccessToken(response),
      )
      sendResume(response, resume)
    },
    confirmCandidateData: async (
      request: Request,
      response: Response<ResumeResponse>,
    ): Promise<void> => {
      const input = resumeUpdateSchema.parse(request.body)
      const resume = await resumeService.confirmCandidateData(
        requireAuth(request),
        requireAccessToken(response),
        input.candidateData,
      )
      sendResume(response, resume)
    },
    deleteResume: async (request: Request, response: Response): Promise<void> => {
      await resumeService.deleteResume(requireAuth(request), requireAccessToken(response))
      response.status(204).send()
    },
    getResume: async (request: Request, response: Response<ResumeResponse>): Promise<void> => {
      const resume = await resumeService.getResume(
        requireAuth(request),
        requireAccessToken(response),
      )
      sendResume(response, resume)
    },
    uploadResume: async (request: Request, response: Response<ResumeResponse>): Promise<void> => {
      if (request.file === undefined) {
        throw new AppError(400, 'RESUME_FILE_REQUIRED', 'Choose a PDF resume to upload.')
      }

      const resume = await resumeService.uploadResume(
        requireAuth(request),
        requireAccessToken(response),
        {
          contents: request.file.buffer,
          mimeType: request.file.mimetype,
          originalFilename: request.file.originalname,
        },
      )
      sendResume(response, resume, 201)
    },
  }
}
