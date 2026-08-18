import { profileUpdateSchema } from '@harap/contracts'
import { Router } from 'express'

import { createProfileController } from '../controllers/profile.controller.js'
import { createAuthenticate } from '../middleware/authenticate.js'
import { validateBody } from '../middleware/validate-body.js'
import type { AuthService } from '../services/auth.service.js'
import type { ProfileService } from '../services/profile.service.js'

export function createProfileRouter(authService: AuthService, profileService: ProfileService) {
  const router = Router()
  const authenticate = createAuthenticate(authService)
  const controller = createProfileController(profileService)

  router.use(authenticate)
  router.get('/', controller.getProfile)
  router.patch('/', validateBody(profileUpdateSchema), controller.updateProfile)

  return router
}
