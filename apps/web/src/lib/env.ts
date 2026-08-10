import { z } from 'zod'

const webEnvironmentSchema = z.object({
  VITE_API_URL: z.url(),
  VITE_APP_ENV: z.enum(['development', 'test', 'production']),
})

const result = webEnvironmentSchema.safeParse({
  VITE_API_URL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1',
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV ?? 'development',
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
})
