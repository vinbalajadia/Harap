import type { SupabaseClient } from '@supabase/supabase-js'

import { AppError } from '../lib/app-error.js'
import { createServerSupabaseClient } from '../lib/supabase/client.js'
import type { AuthContext } from '../types/auth.js'
import type { Database } from '../types/database.js'

export type AuthPrincipal = AuthContext

export interface AuthService {
  verifyAccessToken(accessToken: string): Promise<AuthPrincipal>
}

export class SupabaseAuthService implements AuthService {
  private readonly client: SupabaseClient<Database>

  constructor() {
    this.client = createServerSupabaseClient()
  }

  async verifyAccessToken(accessToken: string): Promise<AuthPrincipal> {
    try {
      const {
        data: { user },
        error,
      } = await this.client.auth.getUser(accessToken)

      if (error !== null || user === null) {
        if (error !== null && error.status !== undefined && error.status >= 500) {
          throw new AppError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable.')
        }

        throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Your session is invalid or has expired.')
      }

      return {
        email: user.email ?? null,
        userId: user.id,
      }
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error
      }

      throw new AppError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable.')
    }
  }
}
