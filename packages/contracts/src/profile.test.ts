import { describe, expect, it } from 'vitest'

import { onboardingProfileSchema, profileSchema, profileUpdateSchema } from './profile.js'

describe('profile contracts', () => {
  it('accepts a complete onboarding profile', () => {
    expect(
      onboardingProfileSchema.parse({
        displayName: 'Ada Lovelace',
        experienceLevel: 'fresh_graduate',
        interviewGoal: 'Prepare for a frontend engineering internship interview.',
        preferredLanguage: 'typescript',
        targetRole: 'Frontend Engineer',
      }),
    ).toEqual({
      displayName: 'Ada Lovelace',
      experienceLevel: 'fresh_graduate',
      interviewGoal: 'Prepare for a frontend engineering internship interview.',
      preferredLanguage: 'typescript',
      targetRole: 'Frontend Engineer',
    })
  })

  it('rejects empty and unknown profile updates', () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(false)
    expect(profileUpdateSchema.safeParse({ id: crypto.randomUUID() }).success).toBe(false)
  })

  it('rejects unsupported experience and programming-language values', () => {
    expect(
      onboardingProfileSchema.safeParse({
        displayName: 'Ada Lovelace',
        experienceLevel: 'administrator',
        interviewGoal: 'Prepare for a frontend engineering internship interview.',
        preferredLanguage: 'html',
        targetRole: 'Frontend Engineer',
      }).success,
    ).toBe(false)
  })

  it('allows an incomplete stored profile before onboarding', () => {
    expect(
      profileSchema.safeParse({
        createdAt: '2026-08-10T00:00:00.000Z',
        displayName: null,
        experienceLevel: null,
        id: crypto.randomUUID(),
        interviewGoal: null,
        onboardingCompleted: false,
        preferredLanguage: null,
        targetRole: null,
        updatedAt: '2026-08-10T00:00:00.000Z',
      }).success,
    ).toBe(true)
  })
})
