import { randomUUID } from 'node:crypto'
import type { ServerResponse } from 'node:http'

import { apiErrorSchema, type ApiError } from '@harap/contracts'
import type { Response } from 'express'

type HeaderResponse = Pick<ServerResponse, 'getHeader' | 'setHeader'>

export function getRequestId(response: HeaderResponse): string {
  const currentValue = response.getHeader('X-Request-Id')

  if (typeof currentValue === 'string') {
    return currentValue
  }

  const requestId = randomUUID()
  response.setHeader('X-Request-Id', requestId)
  return requestId
}

export function sendError(
  response: Response,
  statusCode: number,
  code: string,
  message: string,
): Response<ApiError> {
  const body = apiErrorSchema.parse({
    error: { code, message },
    meta: { requestId: getRequestId(response) },
  })

  return response.status(statusCode).json(body)
}
