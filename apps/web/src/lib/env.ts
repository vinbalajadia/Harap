import { z } from 'zod'

const apiUrlSchema = z.union([
  z.url(),
  z.string().regex(/^\/(?!\/)[A-Za-z0-9/_-]+$/, 'Must be an absolute URL or same-origin path.'),
])

export const webEnvironmentSchema = z.object({
  VITE_API_URL: apiUrlSchema,
  VITE_APP_ENV: z.enum(['development', 'test', 'production']),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
  VITE_SUPABASE_URL: z.url(),
})

const result = webEnvironmentSchema.safeParse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
})

if (!result.success) {
  const variableNames = result.error.issues
    .map((issue) => issue.path.join('.') || 'environment')
    .join(', ')

  throw new Error(`Invalid public environment configuration: ${variableNames}`)
}

export const webEnv = Object.freeze({
  apiUrl: result.data.VITE_API_URL.replace(/\/$/, ''),
  appEnvironment: result.data.VITE_APP_ENV,
  supabaseAnonKey: result.data.VITE_SUPABASE_ANON_KEY,
  supabaseUrl: result.data.VITE_SUPABASE_URL,
})
