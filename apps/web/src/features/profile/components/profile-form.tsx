import { zodResolver } from '@hookform/resolvers/zod'
import {
  experienceLevels,
  onboardingProfileSchema,
  preferredLanguages,
  type OnboardingProfile,
  type Profile,
} from '@harap/contracts'
import { useState } from 'react'
import { useForm, type DefaultValues } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiClientError } from '@/services/api-client'

import { AuthMessage } from '@/features/auth/components/auth-message'
import { FormField } from '@/features/auth/components/form-field'

const experienceLabels: Record<(typeof experienceLevels)[number], string> = {
  career_shifter: 'Career shifter',
  fresh_graduate: 'Fresh graduate',
  junior: 'Junior engineer',
  student: 'Student',
}

const languageLabels: Record<(typeof preferredLanguages)[number], string> = {
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  java: 'Java',
  javascript: 'JavaScript',
  other: 'Other',
  python: 'Python',
  rust: 'Rust',
  typescript: 'TypeScript',
}

interface ProfileFormProps {
  profile: Profile
  submitLabel: string
  submittingLabel: string
  onSave: (profile: OnboardingProfile) => Promise<void>
  successMessage?: string | null
}

export function ProfileForm({
  onSave,
  profile,
  submitLabel,
  submittingLabel,
  successMessage,
}: ProfileFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const defaultValues: DefaultValues<OnboardingProfile> = {
    displayName: profile.displayName ?? '',
    interviewGoal: profile.interviewGoal ?? '',
    targetRole: profile.targetRole ?? '',
  }

  if (profile.experienceLevel !== null) {
    defaultValues.experienceLevel = profile.experienceLevel
  }
  if (profile.preferredLanguage !== null) {
    defaultValues.preferredLanguage = profile.preferredLanguage
  }

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<OnboardingProfile, unknown, OnboardingProfile>({
    defaultValues,
    resolver: zodResolver(onboardingProfileSchema),
  })

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null)
    try {
      await onSave(input)
    } catch (error: unknown) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : 'Your profile could not be saved. Please try again.',
      )
    }
  })

  return (
    <form className="space-y-6" noValidate onSubmit={onSubmit}>
      {formError === null ? null : <AuthMessage>{formError}</AuthMessage>}
      {successMessage === undefined || successMessage === null ? null : (
        <AuthMessage tone="success">{successMessage}</AuthMessage>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField error={errors.displayName?.message} htmlFor="display-name" label="Display name">
          <Input
            aria-invalid={errors.displayName !== undefined}
            autoComplete="name"
            id="display-name"
            placeholder="How should Harap address you?"
            {...register('displayName')}
          />
        </FormField>
        <FormField
          error={errors.experienceLevel?.message}
          htmlFor="experience-level"
          label="Experience level"
        >
          <Select
            aria-invalid={errors.experienceLevel !== undefined}
            id="experience-level"
            {...register('experienceLevel')}
          >
            <option value="">Choose your level</option>
            {experienceLevels.map((level) => (
              <option key={level} value={level}>
                {experienceLabels[level]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField error={errors.targetRole?.message} htmlFor="target-role" label="Target role">
          <Input
            aria-invalid={errors.targetRole !== undefined}
            id="target-role"
            placeholder="e.g. Frontend Engineer"
            {...register('targetRole')}
          />
        </FormField>
        <FormField
          error={errors.preferredLanguage?.message}
          htmlFor="preferred-language"
          label="Preferred programming language"
        >
          <Select
            aria-invalid={errors.preferredLanguage !== undefined}
            id="preferred-language"
            {...register('preferredLanguage')}
          >
            <option value="">Choose a programming language</option>
            {preferredLanguages.map((language) => (
              <option key={language} value={language}>
                {languageLabels[language]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField
        error={errors.interviewGoal?.message}
        htmlFor="interview-goal"
        label="Interview goal"
      >
        <Textarea
          aria-invalid={errors.interviewGoal !== undefined}
          id="interview-goal"
          placeholder="What would make your practice sessions valuable?"
          {...register('interviewGoal')}
        />
      </FormField>

      <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  )
}
