import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'

const app = createApp()
const server = app.listen(env.port, () => {
  logger.info({ port: env.port }, 'Harap API listening')
})

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'Shutting down Harap API')

  server.close((error) => {
    if (error !== undefined) {
      logger.error({ err: error }, 'Failed to close the HTTP server cleanly')
      process.exitCode = 1
    }
  })
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
