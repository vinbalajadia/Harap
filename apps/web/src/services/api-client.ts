import { healthResponseSchema, type HealthData } from '@harap/contracts'

import { webEnv } from '@/lib/env'

export class ApiClientError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiClientError'
    this.statusCode = statusCode
  }
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
