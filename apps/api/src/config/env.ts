import { z } from 'zod'

export const environmentSchema = z.object({
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url()).min(1)),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_URL: z.url(),
})

const testDefaults =
  process.env.NODE_ENV === 'test'
    ? {
        SUPABASE_ANON_KEY: 'test-anon-key-not-used-for-network-calls',
        SUPABASE_URL: 'http://127.0.0.1:54321',
      }
    : {}

export function parseEnvironment(input: NodeJS.ProcessEnv) {
  return environmentSchema.safeParse({ ...testDefaults, ...input })
}

const result = parseEnvironment(process.env)

if (!result.success) {
  const variableNames = result.error.issues
    .map((issue) => issue.path.join('.') || 'environment')
    .join(', ')

  throw new Error(`Invalid environment configuration: ${variableNames}`)
}

export const env = Object.freeze({
  corsAllowedOrigins: result.data.CORS_ALLOWED_ORIGINS,
  logLevel: result.data.LOG_LEVEL,
  nodeEnv: result.data.NODE_ENV,
  port: result.data.PORT,
  supabaseAnonKey: result.data.SUPABASE_ANON_KEY,
  supabaseUrl: result.data.SUPABASE_URL,
})
