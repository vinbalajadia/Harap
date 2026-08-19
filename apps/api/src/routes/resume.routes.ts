import { resumeMaxFileSizeBytes, resumeUpdateSchema } from '@harap/contracts'
import { Router, type NextFunction, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import multer from 'multer'

import { createResumeController } from '../controllers/resume.controller.js'
import { sendError } from '../lib/api-response.js'
import { AppError } from '../lib/app-error.js'
import { createAuthenticate } from '../middleware/authenticate.js'
import { validateBody } from '../middleware/validate-body.js'
import type { AuthService } from '../services/auth.service.js'
import type { ResumeService } from '../services/resume.service.js'

const upload = multer({
  limits: {
    fieldNameSize: 50,
    fields: 0,
    fileSize: resumeMaxFileSizeBytes,
    files: 1,
    headerPairs: 50,
    parts: 2,
  },
  storage: multer.memoryStorage(),
})

function parseResumeUpload(request: Request, response: Response, next: NextFunction): void {
  upload.single('resume')(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(413, 'RESUME_FILE_TOO_LARGE', 'PDF resumes must be 5 MiB or smaller.'))
        return
      }

      next(new AppError(400, 'INVALID_RESUME_UPLOAD', 'Upload one PDF using the resume field.'))
      return
    }

    next(error)
  })
}

function createSensitiveRateLimit(limit: number, message: string) {
  return rateLimit({
    handler: (_request, response) => {
      sendError(response, 429, 'RATE_LIMITED', message)
    },
    legacyHeaders: false,
    limit,
    standardHeaders: 'draft-8',
    windowMs: 60 * 60 * 1000,
  })
}

export interface ResumeRouterOptions {
  analysisRateLimitMax?: number
  uploadRateLimitMax?: number
}

export function createResumeRouter(
  authService: AuthService,
  resumeService: ResumeService,
  { analysisRateLimitMax = 10, uploadRateLimitMax = 5 }: ResumeRouterOptions = {},
) {
  const router = Router()
  const authenticate = createAuthenticate(authService)
  const controller = createResumeController(resumeService)

  router.use(authenticate)
  router.get('/', controller.getResume)
  router.post(
    '/',
    createSensitiveRateLimit(uploadRateLimitMax, 'Too many resume uploads. Try again later.'),
    parseResumeUpload,
    controller.uploadResume,
  )
  router.post(
    '/analyze',
    createSensitiveRateLimit(analysisRateLimitMax, 'Too many analysis attempts. Try again later.'),
    controller.analyzeResume,
  )
  router.patch('/', validateBody(resumeUpdateSchema), controller.confirmCandidateData)
  router.delete('/', controller.deleteResume)

  return router
}
