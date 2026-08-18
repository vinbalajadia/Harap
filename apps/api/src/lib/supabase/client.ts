import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { env } from '../../config/env.js'
import type { Database } from '../../types/database.js'

const serverAuthOptions = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
} as const

export function createServerSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: serverAuthOptions,
  })
}

export function createUserScopedSupabaseClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: serverAuthOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
