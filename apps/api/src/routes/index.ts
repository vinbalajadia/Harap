import { Router } from 'express'

import { healthRouter } from './health.routes.js'
import { createProfileRouter } from './profile.routes.js'
import { createResumeRouter, type ResumeRouterOptions } from './resume.routes.js'
import type { AuthService } from '../services/auth.service.js'
import type { ProfileService } from '../services/profile.service.js'
import type { ResumeService } from '../services/resume.service.js'

export function createApiRouter(
  authService: AuthService,
  profileService: ProfileService,
  resumeService: ResumeService,
  resumeRouterOptions?: ResumeRouterOptions,
): Router {
  const apiRouter = Router()

  apiRouter.use('/health', healthRouter)
  apiRouter.use('/profile', createProfileRouter(authService, profileService))
  apiRouter.use('/resume', createResumeRouter(authService, resumeService, resumeRouterOptions))

  return apiRouter
}
