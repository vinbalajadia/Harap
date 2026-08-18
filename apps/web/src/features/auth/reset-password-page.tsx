import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'

import { LoadingScreen } from '@/components/common/loading-screen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { useAuth } from './auth-context'
import { AuthLayout } from './components/auth-layout'
import { AuthMessage } from './components/auth-message'
import { FormField } from './components/form-field'
import { resetPasswordSchema, type ResetPasswordInput } from './auth-schemas'
import { SafeAuthError, updatePassword } from './auth-service'

export function ResetPasswordPage() {
  const { isLoading, isPasswordRecovery, user } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [updated, setUpdated] = useState(false)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  if (isLoading) return <LoadingScreen label="Validating recovery link" />

  if (!isPasswordRecovery || user === null) {
    return (
      <AuthLayout
        description="A valid, unused recovery session is required."
        title="Recovery link unavailable"
      >
        <AuthMessage>This recovery link is invalid or expired. Request a new one.</AuthMessage>
        <Link
          className="mt-4 block text-center text-sm font-medium underline-offset-4 hover:underline"
          to="/forgot-password"
        >
          Request another recovery link
        </Link>
      </AuthLayout>
    )
  }

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null)
    try {
      await updatePassword(input)
      setUpdated(true)
    } catch (error: unknown) {
      setFormError(
        error instanceof SafeAuthError ? error.message : 'Your password could not be updated.',
      )
    }
  })

  return (
    <AuthLayout
      description="Choose a new password for your Harap account."
      title="Set a new password"
    >
      {updated ? (
        <div className="space-y-4">
          <AuthMessage tone="success">Your password has been updated successfully.</AuthMessage>
          <Link
            className="block text-center text-sm font-medium underline-offset-4 hover:underline"
            to="/app"
          >
            Continue to Harap
          </Link>
        </div>
      ) : (
        <form className="space-y-4" noValidate onSubmit={onSubmit}>
          {formError === null ? null : <AuthMessage>{formError}</AuthMessage>}
          <FormField error={errors.password?.message} htmlFor="password" label="New password">
            <Input
              aria-invalid={errors.password !== undefined}
              autoComplete="new-password"
              id="password"
              type="password"
              {...register('password')}
            />
          </FormField>
          <FormField
            error={errors.confirmPassword?.message}
            htmlFor="confirm-password"
            label="Confirm new password"
          >
            <Input
              aria-invalid={errors.confirmPassword !== undefined}
              autoComplete="new-password"
              id="confirm-password"
              type="password"
              {...register('confirmPassword')}
            />
          </FormField>
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
