import { randomUUID } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'

export function requestContext(_request: Request, response: Response, next: NextFunction): void {
  response.setHeader('X-Request-Id', randomUUID())
  next()
}
