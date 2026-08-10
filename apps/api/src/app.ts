import cors from 'cors'
import express, { type Express } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

import { env } from './config/env.js'
import { sendError } from './lib/api-response.js'
import { AppError } from './lib/app-error.js'
import { errorHandler } from './middleware/error-handler.js'
import { notFound } from './middleware/not-found.js'
import { requestContext } from './middleware/request-context.js'
import { requestLogger } from './middleware/request-logger.js'
import { apiRouter } from './routes/index.js'

export interface CreateAppOptions {
  rateLimitMax?: number
}

export function createApp({ rateLimitMax = 100 }: CreateAppOptions = {}): Express {
  const app = express()

  app.disable('x-powered-by')
  app.use(requestContext)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          baseUri: ["'none'"],
          defaultSrc: ["'none'"],
          formAction: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      strictTransportSecurity:
        env.nodeEnv === 'production'
          ? { includeSubDomains: true, maxAge: 31_536_000, preload: true }
          : false,
    }),
  )
  app.use(
    cors({
      allowedHeaders: ['Authorization', 'Content-Type'],
      credentials: false,
      exposedHeaders: ['X-Request-Id'],
      maxAge: 600,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      origin: (origin, callback) => {
        if (origin === undefined || env.corsAllowedOrigins.includes(origin)) {
          callback(null, true)
          return
        }

        callback(new AppError(403, 'CORS_ORIGIN_DENIED', 'This origin is not allowed.'))
      },
    }),
  )
  app.use(express.json({ limit: '64kb', strict: true }))
  app.use(
    rateLimit({
      handler: (_request, response) => {
        sendError(response, 429, 'RATE_LIMITED', 'Too many requests. Please try again later.')
      },
      legacyHeaders: false,
      limit: rateLimitMax,
      standardHeaders: 'draft-8',
      windowMs: 60_000,
    }),
  )
  app.use(requestLogger)
  app.use('/api/v1', apiRouter)
  app.use(notFound)
  app.use(errorHandler)

  return app
}
