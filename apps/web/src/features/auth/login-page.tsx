import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { AuthLayout } from './components/auth-layout'
import { AuthMessage } from './components/auth-message'
import { FormField } from './components/form-field'
import { getSafeAuthDestination } from './auth-redirect'
import { loginSchema, type LoginInput } from './auth-schemas'
import { login, SafeAuthError } from './auth-service'

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null)
    try {
      await login(input)
      await navigate(getSafeAuthDestination(location.state), { replace: true })
    } catch (error: unknown) {
      setFormError(error instanceof SafeAuthError ? error.message : 'Sign in failed. Try again.')
    }
  })

  return (
    <AuthLayout
      description="Continue your interview practice and coaching journey."
      footer={
        <>
          New to Harap?{' '}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            to="/register"
          >
            Create an account
          </Link>
        </>
      }
      title="Welcome back"
    >
      <form className="space-y-4" noValidate onSubmit={onSubmit}>
        {formError === null ? null : <AuthMessage>{formError}</AuthMessage>}
        <FormField error={errors.email?.message} htmlFor="email" label="Email address">
          <Input
            aria-describedby={errors.email === undefined ? undefined : 'email-error'}
            aria-invalid={errors.email !== undefined}
            autoComplete="email"
            id="email"
            type="email"
            {...register('email')}
          />
        </FormField>
        <FormField error={errors.password?.message} htmlFor="password" label="Password">
          <Input
            aria-describedby={errors.password === undefined ? undefined : 'password-error'}
            aria-invalid={errors.password !== undefined}
            autoComplete="current-password"
            id="password"
            type="password"
            {...register('password')}
          />
        </FormField>
        <div className="flex justify-end">
          <Link
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            to="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
