import type { NextFunction, Request, Response } from 'express'

import { AppError } from '../lib/app-error.js'
import type { AuthService } from '../services/auth.service.js'

function extractBearerToken(authorizationHeader: string | undefined): string {
  if (authorizationHeader === undefined) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Sign in to continue.')
  }

  const match = /^Bearer ([^\s]+)$/i.exec(authorizationHeader)

  if (match?.[1] === undefined) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Sign in to continue.')
  }

  return match[1]
}

export function createAuthenticate(authService: AuthService) {
  return async function authenticate(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const accessToken = extractBearerToken(request.get('Authorization'))
      const principal = await authService.verifyAccessToken(accessToken)

      request.auth = principal
      response.locals.accessToken = accessToken
      next()
    } catch (error: unknown) {
      next(error)
    }
  }
}
