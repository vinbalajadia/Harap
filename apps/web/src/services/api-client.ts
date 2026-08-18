import { apiErrorSchema, healthResponseSchema, type HealthData } from '@harap/contracts'
import type { ZodType } from 'zod'

import { webEnv } from '@/lib/env'
import { getAccessToken, setAccessToken } from '@/lib/supabase/access-token'
import { supabase } from '@/lib/supabase/client'

export class ApiClientError extends Error {
  readonly code: string
  readonly statusCode: number

  constructor(message: string, statusCode: number, code = 'API_REQUEST_FAILED') {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.statusCode = statusCode
  }
}

async function readApiError(response: Response): Promise<ApiClientError> {
  try {
    const payload: unknown = await response.json()
    const result = apiErrorSchema.safeParse(payload)

    if (result.success) {
      return new ApiClientError(result.data.error.message, response.status, result.data.error.code)
    }
  } catch {
    // The fallback below intentionally hides invalid or non-JSON upstream details.
  }

  return new ApiClientError('The request could not be completed.', response.status)
}

export async function authenticatedApiRequest<T>(
  path: string,
  schema: ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = getAccessToken()

  if (accessToken === null) {
    throw new ApiClientError('Sign in to continue.', 401, 'AUTH_REQUIRED')
  }

  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${webEnv.apiUrl}${path}`, { ...options, headers })

  if (!response.ok) {
    const error = await readApiError(response)

    if (response.status === 401) {
      setAccessToken(null)
      await supabase.auth.signOut({ scope: 'local' })
    }

    throw error
  }

  const payload: unknown = await response.json()
  const result = schema.safeParse(payload)

  if (!result.success) {
    throw new ApiClientError('The Harap API returned an invalid response.', 502)
  }

  return result.data
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthData> {
  const requestOptions: RequestInit = {
    headers: { Accept: 'application/json' },
  }

  if (signal !== undefined) {
    requestOptions.signal = signal
  }

  const response = await fetch(`${webEnv.apiUrl}/health`, requestOptions)

  if (!response.ok) {
    throw new ApiClientError('The Harap API is currently unavailable.', response.status)
  }

  const payload: unknown = await response.json()
  const result = healthResponseSchema.safeParse(payload)

  if (!result.success) {
    throw new ApiClientError('The Harap API returned an invalid response.', 502)
  }

  return result.data.data
}
