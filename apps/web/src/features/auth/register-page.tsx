import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { AuthLayout } from './components/auth-layout'
import { AuthMessage } from './components/auth-message'
import { FormField } from './components/form-field'
import { registerSchema, type RegisterInput } from './auth-schemas'
import { register as registerAccount, SafeAuthError } from './auth-service'

export function RegisterPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null)
    try {
      const hasSession = await registerAccount(input)
      await navigate(hasSession ? '/app' : '/check-email', {
        replace: true,
        state: hasSession ? undefined : { email: input.email },
      })
    } catch (error: unknown) {
      setFormError(
        error instanceof SafeAuthError ? error.message : 'Registration failed. Try again.',
      )
    }
  })

  return (
    <AuthLayout
      description="Create your account, confirm your email, then tell Harap what you want to practice."
      footer={
        <>
          Already have an account?{' '}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            to="/login"
          >
            Sign in
          </Link>
        </>
      }
      title="Start practicing with purpose"
    >
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
        <FormField error={errors.password?.message} htmlFor="password" label="Password">
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
          label="Confirm password"
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
