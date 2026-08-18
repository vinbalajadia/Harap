import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { AuthLayout } from './components/auth-layout'
import { AuthMessage } from './components/auth-message'
import { FormField } from './components/form-field'
import { forgotPasswordSchema, type ForgotPasswordInput } from './auth-schemas'
import { requestPasswordReset, SafeAuthError } from './auth-service'

export function ForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null)
    try {
      await requestPasswordReset(input)
      setSent(true)
    } catch (error: unknown) {
      setFormError(
        error instanceof SafeAuthError ? error.message : 'The request could not be sent.',
      )
    }
  })

  return (
    <AuthLayout
      description="If an account matches the address, Supabase will send a secure recovery link."
      footer={
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          to="/login"
        >
          Return to sign in
        </Link>
      }
      title="Reset your password"
    >
      {sent ? (
        <AuthMessage tone="success">
          Check your inbox. If an account exists for that email, a recovery link is on its way.
        </AuthMessage>
      ) : (
        <form className="space-y-4" noValidate onSubmit={onSubmit}>
          {formError === null ? null : <AuthMessage>{formError}</AuthMessage>}
          <FormField error={errors.email?.message} htmlFor="email" label="Email address">
            <Input
              aria-invalid={errors.email !== undefined}
              autoComplete="email"
              id="email"
              type="email"
              {...register('email')}
            />
          </FormField>
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Sending…' : 'Send recovery link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
