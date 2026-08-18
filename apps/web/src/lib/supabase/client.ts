import { createClient } from '@supabase/supabase-js'

import { webEnv } from '@/lib/env'

export const supabase = createClient(webEnv.supabaseUrl, webEnv.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    persistSession: true,
  },
})
