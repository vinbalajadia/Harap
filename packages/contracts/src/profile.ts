import { z } from 'zod'

import { apiMetaSchema } from './api-envelope.js'

export const experienceLevels = ['student', 'fresh_graduate', 'junior', 'career_shifter'] as const
export const preferredLanguages = [
  'javascript',
  'typescript',
  'python',
  'java',
  'csharp',
  'cpp',
  'go',
  'rust',
  'other',
] as const

export const experienceLevelSchema = z.enum(experienceLevels)
export const preferredLanguageSchema = z.enum(preferredLanguages)

const profileFields = {
  displayName: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters.')
    .max(80, 'Use no more than 80 characters.'),
  experienceLevel: experienceLevelSchema,
  interviewGoal: z
    .string()
    .trim()
    .min(10, 'Describe your goal in at least 10 characters.')
    .max(500, 'Use no more than 500 characters.'),
  preferredLanguage: preferredLanguageSchema,
  targetRole: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters.')
    .max(100, 'Use no more than 100 characters.'),
}

export const onboardingProfileSchema = z.object(profileFields).strict()

export const profileUpdateSchema = z
  .object({
    displayName: profileFields.displayName.optional(),
    experienceLevel: profileFields.experienceLevel.optional(),
    interviewGoal: profileFields.interviewGoal.optional(),
    preferredLanguage: profileFields.preferredLanguage.optional(),
    targetRole: profileFields.targetRole.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field is required.',
  })

export const profileSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  displayName: profileFields.displayName.nullable(),
  experienceLevel: profileFields.experienceLevel.nullable(),
  id: z.uuid(),
  interviewGoal: profileFields.interviewGoal.nullable(),
  onboardingCompleted: z.boolean(),
  preferredLanguage: profileFields.preferredLanguage.nullable(),
  targetRole: profileFields.targetRole.nullable(),
  updatedAt: z.iso.datetime({ offset: true }),
})

export const profileResponseSchema = z.object({
  data: profileSchema,
  meta: apiMetaSchema,
})

export type ExperienceLevel = z.infer<typeof experienceLevelSchema>
export type OnboardingProfile = z.infer<typeof onboardingProfileSchema>
export type PreferredLanguage = z.infer<typeof preferredLanguageSchema>
export type Profile = z.infer<typeof profileSchema>
export type ProfileResponse = z.infer<typeof profileResponseSchema>
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>
