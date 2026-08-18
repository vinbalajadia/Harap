import { Router } from 'express'

import { healthRouter } from './health.routes.js'
import { createProfileRouter } from './profile.routes.js'
import type { AuthService } from '../services/auth.service.js'
import type { ProfileService } from '../services/profile.service.js'

export function createApiRouter(authService: AuthService, profileService: ProfileService) {
  const apiRouter = Router()

  apiRouter.use('/health', healthRouter)
  apiRouter.use('/profile', createProfileRouter(authService, profileService))

  return apiRouter
}
