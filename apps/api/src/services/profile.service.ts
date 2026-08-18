import type { Profile, ProfileUpdate } from '@harap/contracts'

import type {
  PersistedProfileUpdate,
  ProfileRepository,
} from '../repositories/profile.repository.js'
import type { AuthContext } from '../types/auth.js'

function isComplete(profile: Omit<PersistedProfileUpdate, 'onboardingCompleted'>): boolean {
  return (
    profile.displayName !== undefined &&
    profile.experienceLevel !== undefined &&
    profile.interviewGoal !== undefined &&
    profile.preferredLanguage !== undefined &&
    profile.targetRole !== undefined
  )
}

export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  getProfile(auth: AuthContext, accessToken: string): Promise<Profile> {
    return this.repository.findOrCreateOwn(auth, accessToken)
  }

  async updateProfile(
    auth: AuthContext,
    accessToken: string,
    update: ProfileUpdate,
  ): Promise<Profile> {
    const current = await this.repository.findOrCreateOwn(auth, accessToken)
    const merged = {
      displayName: update.displayName ?? current.displayName ?? undefined,
      experienceLevel: update.experienceLevel ?? current.experienceLevel ?? undefined,
      interviewGoal: update.interviewGoal ?? current.interviewGoal ?? undefined,
      preferredLanguage: update.preferredLanguage ?? current.preferredLanguage ?? undefined,
      targetRole: update.targetRole ?? current.targetRole ?? undefined,
    }

    return this.repository.updateOwn(auth, accessToken, {
      ...update,
      onboardingCompleted: isComplete(merged),
    })
  }
}
