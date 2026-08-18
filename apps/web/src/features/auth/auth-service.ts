import type { AuthError } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'

import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from './auth-schemas'

export class SafeAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SafeAuthError'
  }
}

function throwSafeAuthError(error: AuthError | null, fallback: string): void {
  if (error === null) return

  if (error.code === 'email_not_confirmed') {
    throw new SafeAuthError('Confirm your email address before signing in.')
  }

  if (error.code === 'invalid_credentials') {
    throw new SafeAuthError('The email or password is incorrect.')
  }

  if (error.code === 'over_request_rate_limit') {
    throw new SafeAuthError('Too many attempts. Please wait before trying again.')
  }

  throw new SafeAuthError(fallback)
}

export async function login(input: LoginInput): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  throwSafeAuthError(error, 'Sign in failed. Please try again.')
}

export async function register(input: RegisterInput): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    password: input.password,
  })

  throwSafeAuthError(error, 'Registration could not be completed. Please try again.')
  return data.session !== null
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  throwSafeAuthError(error, 'The reset request could not be sent. Please try again later.')
}

export async function updatePassword(input: ResetPasswordInput): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: input.password })

  throwSafeAuthError(error, 'Your password could not be updated. Request a new reset link.')
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    type: 'signup',
  })

  throwSafeAuthError(error, 'A confirmation email could not be sent. Please wait and try again.')
}
