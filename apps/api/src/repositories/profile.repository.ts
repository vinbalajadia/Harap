import {
  experienceLevelSchema,
  preferredLanguageSchema,
  profileSchema,
  type Profile,
  type ProfileUpdate,
} from '@harap/contracts'

import { AppError } from '../lib/app-error.js'
import { createUserScopedSupabaseClient } from '../lib/supabase/client.js'
import type { AuthContext } from '../types/auth.js'
import type { Database } from '../types/database.js'

const profileColumns =
  'id, display_name, experience_level, target_role, preferred_language, onboarding_completed, interview_goal, created_at, updated_at'

export interface PersistedProfileUpdate extends ProfileUpdate {
  onboardingCompleted: boolean
}

export interface ProfileRepository {
  findOrCreateOwn(auth: AuthContext, accessToken: string): Promise<Profile>
  updateOwn(
    auth: AuthContext,
    accessToken: string,
    update: PersistedProfileUpdate,
  ): Promise<Profile>
}

type ProfileRow = Database['public']['Tables']['profiles']['Row']

function toProfile(row: ProfileRow): Profile {
  return profileSchema.parse({
    createdAt: row.created_at,
    displayName: row.display_name,
    experienceLevel:
      row.experience_level === null ? null : experienceLevelSchema.parse(row.experience_level),
    id: row.id,
    interviewGoal: row.interview_goal,
    onboardingCompleted: row.onboarding_completed,
    preferredLanguage:
      row.preferred_language === null
        ? null
        : preferredLanguageSchema.parse(row.preferred_language),
    targetRole: row.target_role,
    updatedAt: row.updated_at,
  })
}

export class SupabaseProfileRepository implements ProfileRepository {
  async findOrCreateOwn(auth: AuthContext, accessToken: string): Promise<Profile> {
    const client = createUserScopedSupabaseClient(accessToken)
    const { data, error } = await client
      .from('profiles')
      .select(profileColumns)
      .eq('id', auth.userId)
      .maybeSingle()

    if (error !== null) {
      throw new AppError(503, 'PROFILE_UNAVAILABLE', 'Your profile is temporarily unavailable.')
    }

    if (data !== null) {
      return toProfile(data)
    }

    const { data: created, error: createError } = await client
      .from('profiles')
      .insert({ id: auth.userId })
      .select(profileColumns)
      .single()

    if (createError !== null) {
      throw new AppError(503, 'PROFILE_UNAVAILABLE', 'Your profile is temporarily unavailable.')
    }

    return toProfile(created)
  }

  async updateOwn(
    auth: AuthContext,
    accessToken: string,
    update: PersistedProfileUpdate,
  ): Promise<Profile> {
    const client = createUserScopedSupabaseClient(accessToken)
    const persistedUpdate: Database['public']['Tables']['profiles']['Update'] = {
      onboarding_completed: update.onboardingCompleted,
    }

    if (update.displayName !== undefined) persistedUpdate.display_name = update.displayName
    if (update.experienceLevel !== undefined) {
      persistedUpdate.experience_level = update.experienceLevel
    }
    if (update.interviewGoal !== undefined) persistedUpdate.interview_goal = update.interviewGoal
    if (update.preferredLanguage !== undefined) {
      persistedUpdate.preferred_language = update.preferredLanguage
    }
    if (update.targetRole !== undefined) persistedUpdate.target_role = update.targetRole

    const { data, error } = await client
      .from('profiles')
      .update(persistedUpdate)
      .eq('id', auth.userId)
      .select(profileColumns)
      .single()

    if (error !== null) {
      throw new AppError(503, 'PROFILE_UPDATE_FAILED', 'Your profile could not be saved.')
    }

    return toProfile(data)
  }
}
