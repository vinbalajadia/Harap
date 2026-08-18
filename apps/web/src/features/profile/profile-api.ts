import { profileResponseSchema, type Profile, type ProfileUpdate } from '@harap/contracts'

import { authenticatedApiRequest } from '@/services/api-client'

export async function fetchProfile(): Promise<Profile> {
  const response = await authenticatedApiRequest('/profile', profileResponseSchema)
  return response.data
}

export async function saveProfile(update: ProfileUpdate): Promise<Profile> {
  const response = await authenticatedApiRequest('/profile', profileResponseSchema, {
    body: JSON.stringify(update),
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  })

  return response.data
}
