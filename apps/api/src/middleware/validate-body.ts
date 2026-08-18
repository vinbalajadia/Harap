import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'

import { sendError } from '../lib/api-response.js'

export function validateBody(schema: ZodType) {
  return function bodyValidator(request: Request, response: Response, next: NextFunction): void {
    const result = schema.safeParse(request.body)

    if (!result.success) {
      sendError(response, 400, 'INVALID_REQUEST_BODY', 'Check the submitted profile fields.')
      return
    }

    request.body = result.data
    next()
  }
}
