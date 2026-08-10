import { pinoHttp } from 'pino-http'

import { getRequestId } from '../lib/api-response.js'
import { logger } from '../lib/logger.js'

export const requestLogger = pinoHttp({
  customProps: (_request, response) => ({
    requestId: getRequestId(response),
  }),
  logger,
  serializers: {
    req: (request) => ({
      id: request.id,
      method: request.method,
      url: request.url,
    }),
    res: (response) => ({
      statusCode: response.statusCode,
    }),
  },
})
