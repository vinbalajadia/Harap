import { profileResponseSchema, profileUpdateSchema, type ProfileResponse } from '@harap/contracts'
import type { Request, Response } from 'express'

import { getRequestId } from '../lib/api-response.js'
import { AppError } from '../lib/app-error.js'
import type { ProfileService } from '../services/profile.service.js'

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

function sendProfile(response: Response<ProfileResponse>, profile: ProfileResponse['data']): void {
  response.status(200).json(
    profileResponseSchema.parse({
      data: profile,
      meta: { requestId: getRequestId(response) },
    }),
  )
}

export function createProfileController(profileService: ProfileService) {
  return {
    getProfile: async (request: Request, response: Response<ProfileResponse>): Promise<void> => {
      const profile = await profileService.getProfile(
        requireAuth(request),
        requireAccessToken(response),
      )
      sendProfile(response, profile)
    },
    updateProfile: async (request: Request, response: Response<ProfileResponse>): Promise<void> => {
      const input = profileUpdateSchema.parse(request.body)
      const profile = await profileService.updateProfile(
        requireAuth(request),
        requireAccessToken(response),
        input,
      )
      sendProfile(response, profile)
    },
  }
}
