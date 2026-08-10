import type { ErrorRequestHandler } from 'express'

import { sendError } from '../lib/api-response.js'
import { AppError } from '../lib/app-error.js'
import { logger } from '../lib/logger.js'

function isInvalidJsonError(error: unknown): error is SyntaxError & { status: 400 } {
  return error instanceof SyntaxError && 'status' in error && error.status === 400
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, next): void => {
  void next

  if (error instanceof AppError) {
    logger.warn({ code: error.code, statusCode: error.statusCode }, 'Request rejected')
    sendError(response, error.statusCode, error.code, error.message)
    return
  }

  if (isInvalidJsonError(error)) {
    sendError(response, 400, 'INVALID_JSON', 'The request body contains invalid JSON.')
    return
  }

  logger.error({ err: error }, 'Unhandled request error')
  sendError(response, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.')
}
