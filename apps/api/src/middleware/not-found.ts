import type { Request, Response } from 'express'

import { sendError } from '../lib/api-response.js'

export function notFound(_request: Request, response: Response): void {
  sendError(response, 404, 'ROUTE_NOT_FOUND', 'The requested resource was not found.')
}
