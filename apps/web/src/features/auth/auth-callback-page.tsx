import { Link, Navigate, useSearchParams } from 'react-router'

import { LoadingScreen } from '@/components/common/loading-screen'

import { useAuth } from './auth-context'
import { AuthLayout } from './components/auth-layout'
import { AuthMessage } from './components/auth-message'

export function AuthCallbackPage() {
  const { isLoading, user } = useAuth()
  const [searchParams] = useSearchParams()

  if (isLoading) return <LoadingScreen label="Confirming your email" />
  if (user !== null) return <Navigate replace to="/app" />

  const linkFailed = searchParams.has('error') || searchParams.has('error_code')

  return (
    <AuthLayout
      description="The confirmation link could not establish a valid Harap session."
      footer={
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          to="/login"
        >
          Return to sign in
        </Link>
      }
      title="Confirmation link unavailable"
    >
      <AuthMessage>
        {linkFailed
          ? 'This link is invalid or expired. Request another confirmation email and try again.'
          : 'No confirmed session was found. Sign in if you have already verified your email.'}
      </AuthMessage>
    </AuthLayout>
  )
}
