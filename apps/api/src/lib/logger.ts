import pino, { type LoggerOptions } from 'pino'

import { env } from '../config/env.js'

const options: LoggerOptions = {
  level: env.nodeEnv === 'test' ? 'silent' : env.logLevel,
  redact: {
    censor: '[REDACTED]',
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'request.headers.authorization',
      'request.headers.cookie',
      '*.accessToken',
      '*.refreshToken',
      '*.password',
      '*.apiKey',
    ],
  },
}

if (env.nodeEnv === 'development') {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:standard',
    },
  }
}

export const logger = pino(options)
