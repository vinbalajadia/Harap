import { useState } from 'react'
import { Link, useLocation } from 'react-router'

import { Button } from '@/components/ui/button'

import { AuthLayout } from './components/auth-layout'
import { AuthMessage } from './components/auth-message'
import { resendConfirmation, SafeAuthError } from './auth-service'

function getEmail(state: unknown): string | null {
  return typeof state === 'object' &&
    state !== null &&
    'email' in state &&
    typeof state.email === 'string'
    ? state.email
    : null
}

export function CheckEmailPage() {
  const email = getEmail(useLocation().state)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const resend = async () => {
    if (email === null || isPending) return
    setIsPending(true)
    setMessage(null)
    try {
      await resendConfirmation(email)
      setMessage('A new confirmation email was requested. Check your inbox.')
    } catch (error: unknown) {
      setMessage(error instanceof SafeAuthError ? error.message : 'Please wait and try again.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AuthLayout
      description="Open the confirmation link before signing in. The link may take a moment to arrive."
      footer={
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          to="/login"
        >
          Go to sign in
        </Link>
      }
      title="Check your email"
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>For your security, Harap requires a verified email address.</p>
        {message === null ? null : (
          <AuthMessage tone={message.startsWith('A new') ? 'success' : 'error'}>
            {message}
          </AuthMessage>
        )}
        {email === null ? null : (
          <Button className="w-full" disabled={isPending} onClick={resend} variant="outline">
            {isPending ? 'Requesting…' : 'Resend confirmation email'}
          </Button>
        )}
      </div>
    </AuthLayout>
  )
}
