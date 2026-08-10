import { healthResponseSchema, type HealthResponse } from '@harap/contracts'
import type { Request, Response } from 'express'

import { getRequestId } from '../lib/api-response.js'

export function getHealth(_request: Request, response: Response<HealthResponse>): void {
  const body = healthResponseSchema.parse({
    data: {
      service: 'harap-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
    meta: {
      requestId: getRequestId(response),
    },
  })

  response.status(200).json(body)
}
