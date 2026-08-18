import { apiErrorSchema, profileResponseSchema, type Profile } from '@harap/contracts'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from './app.js'
import { AppError } from './lib/app-error.js'
import type { ProfileRepository } from './repositories/profile.repository.js'
import type { AuthService } from './services/auth.service.js'

const userAId = '10000000-0000-4000-8000-000000000001'
const userBId = '20000000-0000-4000-8000-000000000002'

function incompleteProfile(id: string): Profile {
  return {
    createdAt: '2026-08-10T00:00:00.000Z',
    displayName: null,
    experienceLevel: null,
    id,
    interviewGoal: null,
    onboardingCompleted: false,
    preferredLanguage: null,
    targetRole: null,
    updatedAt: '2026-08-10T00:00:00.000Z',
  }
}

describe('authenticated profile API', () => {
  const profiles = new Map<string, Profile>()
  const authService: AuthService = {
    verifyAccessToken: vi.fn(async (accessToken) => {
      if (accessToken === 'valid-user-a') {
        return { email: 'a@example.test', userId: userAId }
      }
      if (accessToken === 'valid-user-b') {
        return { email: 'b@example.test', userId: userBId }
      }

      throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Your session is invalid or has expired.')
    }),
  }
  const profileRepository: ProfileRepository = {
    findOrCreateOwn: vi.fn(async (auth) => {
      const profile = profiles.get(auth.userId) ?? incompleteProfile(auth.userId)
      profiles.set(auth.userId, profile)
      return profile
    }),
    updateOwn: vi.fn(async (auth, _accessToken, update) => {
      const current = profiles.get(auth.userId) ?? incompleteProfile(auth.userId)
      const profile: Profile = {
        ...current,
        ...update,
        updatedAt: '2026-08-10T01:00:00.000Z',
      }
      profiles.set(auth.userId, profile)
      return profile
    }),
  }
  const app = createApp({ authService, profileRepository })

  beforeEach(() => {
    profiles.clear()
    vi.clearAllMocks()
  })

  it('rejects missing, malformed, and invalid bearer credentials', async () => {
    const missing = await request(app).get('/api/v1/profile').expect(401)
    const malformed = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', 'Basic credentials')
      .expect(401)
    const invalid = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', 'Bearer expired-token')
      .expect(401)

    expect(apiErrorSchema.parse(missing.body).error.code).toBe('AUTH_REQUIRED')
    expect(apiErrorSchema.parse(malformed.body).error.code).toBe('AUTH_REQUIRED')
    expect(apiErrorSchema.parse(invalid.body).error.code).toBe('INVALID_ACCESS_TOKEN')
  })

  it('returns only the profile derived from the verified token', async () => {
    profiles.set(userBId, { ...incompleteProfile(userBId), displayName: 'User B' })

    const response = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', 'Bearer valid-user-a')
      .expect(200)
    const body = profileResponseSchema.parse(response.body)

    expect(body.data.id).toBe(userAId)
    expect(body.data.displayName).toBeNull()
    expect(JSON.stringify(body)).not.toContain('valid-user-a')
  })

  it('validates, persists, and completes onboarding without accepting ownership fields', async () => {
    const response = await request(app)
      .patch('/api/v1/profile')
      .set('Authorization', 'Bearer valid-user-a')
      .send({
        displayName: 'User A',
        experienceLevel: 'fresh_graduate',
        interviewGoal: 'Practice clearly explaining frontend engineering decisions.',
        preferredLanguage: 'typescript',
        targetRole: 'Frontend Engineer',
      })
      .expect(200)
    const body = profileResponseSchema.parse(response.body)

    expect(body.data.onboardingCompleted).toBe(true)
    expect(body.data.id).toBe(userAId)
    expect(body.meta.requestId).toBe(response.headers['x-request-id'])

    const ownershipAttempt = await request(app)
      .patch('/api/v1/profile')
      .set('Authorization', 'Bearer valid-user-a')
      .send({ displayName: 'User A', id: userBId })
      .expect(400)

    expect(apiErrorSchema.parse(ownershipAttempt.body).error.code).toBe('INVALID_REQUEST_BODY')
    expect(profiles.get(userBId)).toBeUndefined()
  })
})
