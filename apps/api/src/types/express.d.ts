import type { AuthContext } from './auth.js'

declare global {
  namespace Express {
    interface Locals {
      accessToken?: string
    }

    interface Request {
      auth?: AuthContext
    }
  }
}

export {}
