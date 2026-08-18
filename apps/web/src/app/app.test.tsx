import { onboardingProfileSchema, type Profile } from '@harap/contracts'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface MockSession {
  access_token: string
  user: { email: string; id: string }
}

type AuthEvent =
  'INITIAL_SESSION' | 'PASSWORD_RECOVERY' | 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED'

type AuthCallback = (event: AuthEvent, session: MockSession | null) => void

const authState = vi.hoisted(() => ({
  callback: null as AuthCallback | null,
  currentSession: null as MockSession | null,
  deferInitialEvent: false,
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: AuthCallback) => {
        authState.callback = callback
        if (!authState.deferInitialEvent) callback('INITIAL_SESSION', authState.currentSession)
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
      resend: authState.resend,
      resetPasswordForEmail: authState.resetPasswordForEmail,
      signInWithPassword: authState.signInWithPassword,
      signOut: authState.signOut,
      signUp: authState.signUp,
      updateUser: authState.updateUser,
    },
  },
}))

import { App } from './app'

const userId = '10000000-0000-4000-8000-000000000001'
const session: MockSession = {
  access_token: 'valid-user-a',
  user: { email: 'user-a@example.test', id: userId },
}

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    createdAt: '2026-08-10T00:00:00.000Z',
    displayName: null,
    experienceLevel: null,
    id: userId,
    interviewGoal: null,
    onboardingCompleted: false,
    preferredLanguage: null,
    targetRole: null,
    updatedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  }
}

function apiResponse(data: unknown): Response {
  return new Response(
    JSON.stringify({
      data,
      meta: { requestId: '0198a7cd-14f8-7000-8000-000000000001' },
    }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 },
  )
}

describe('Harap application flows', () => {
  let profile = createProfile()
  let lastProfileRequestUrl: string | null = null
  let lastProfileUpdate: unknown = null

  beforeEach(() => {
    authState.callback = null
    authState.currentSession = null
    authState.deferInitialEvent = false
    profile = createProfile()
    lastProfileRequestUrl = null
    lastProfileUpdate = null
    vi.clearAllMocks()

    authState.signInWithPassword.mockImplementation(async () => {
      authState.currentSession = session
      authState.callback?.('SIGNED_IN', session)
      return { data: { session, user: session.user }, error: null }
    })
    authState.signUp.mockResolvedValue({ data: { session: null, user: session.user }, error: null })
    authState.signOut.mockImplementation(async () => {
      authState.currentSession = null
      authState.callback?.('SIGNED_OUT', null)
      return { error: null }
    })
    authState.resend.mockResolvedValue({ data: {}, error: null })
    authState.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    authState.updateUser.mockResolvedValue({ data: { user: session.user }, error: null })

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input instanceof Request ? input.url : input.toString()

        if (url.endsWith('/health')) {
          return apiResponse({
            service: 'harap-api',
            status: 'ok',
            timestamp: '2026-08-10T02:30:00.000Z',
            version: 'v1',
          })
        }

        if (url.endsWith('/profile') && init?.method === 'PATCH') {
          lastProfileRequestUrl = url
          lastProfileUpdate = JSON.parse(String(init.body)) as unknown
          const update = onboardingProfileSchema.parse(lastProfileUpdate)
          profile = createProfile({
            displayName: update.displayName,
            experienceLevel: update.experienceLevel,
            interviewGoal: update.interviewGoal,
            onboardingCompleted: true,
            preferredLanguage: update.preferredLanguage,
            targetRole: update.targetRole,
            updatedAt: '2026-08-10T01:00:00.000Z',
          })
          return apiResponse(profile)
        }

        if (url.endsWith('/profile')) {
          lastProfileRequestUrl = url
          return apiResponse(profile)
        }

        return new Response(null, { status: 404 })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the branded public shell and validated API status', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Face every interview with confidence.' }),
    ).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeTruthy()
    expect(await screen.findByText('API online')).toBeTruthy()
  })

  it('provides keyboard-focusable public navigation', async () => {
    const user = userEvent.setup()
    render(<App />)

    const homeLink = await screen.findByRole('link', { name: 'Harap home' })
    await user.tab()

    expect(document.activeElement).toBe(homeLink)
  })

  it('redirects anonymous protected routes and preserves the destination after login', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/app/profile')
    profile = createProfile({
      displayName: 'User A',
      experienceLevel: 'fresh_graduate',
      interviewGoal: 'Prepare for a frontend engineering internship interview.',
      onboardingCompleted: true,
      preferredLanguage: 'typescript',
      targetRole: 'Frontend Engineer',
    })
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeTruthy()
    await user.type(screen.getByLabelText('Email address'), 'user-a@example.test')
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery-staple')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Your coaching profile' })).toBeTruthy()
    expect(authState.signInWithPassword).toHaveBeenCalledWith({
      email: 'user-a@example.test',
      password: 'correct-horse-battery-staple',
    })
    expect(lastProfileRequestUrl).toBe('/api/v1/profile')
  })

  it('keeps protected content hidden while the initial auth session is loading', async () => {
    authState.deferInitialEvent = true
    window.history.pushState({}, '', '/app')
    render(<App />)

    expect(await screen.findByText('Loading Harap')).toBeTruthy()
    expect(screen.queryByText('Harap workspace')).toBeNull()
  })

  it('validates the login form before calling Supabase Auth', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/login')
    render(<App />)

    await user.type(await screen.findByLabelText('Email address'), 'invalid')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy()
    expect(await screen.findByText('Enter your password.')).toBeTruthy()
    expect(authState.signInWithPassword).not.toHaveBeenCalled()
  })

  it('validates registration locally and then shows the email confirmation state', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/register')
    render(<App />)

    await user.type(await screen.findByLabelText('Email address'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.type(screen.getByLabelText('Confirm password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy()
    expect(authState.signUp).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText('Email address'))
    await user.clear(screen.getByLabelText('Password'))
    await user.clear(screen.getByLabelText('Confirm password'))
    await user.type(screen.getByLabelText('Email address'), 'new-user@example.test')
    await user.type(screen.getByLabelText('Password'), 'strong-password')
    await user.type(screen.getByLabelText('Confirm password'), 'strong-password')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeTruthy()
    expect(authState.signUp).toHaveBeenCalledOnce()
  })

  it('routes an incomplete authenticated profile through onboarding without an ownership field', async () => {
    const user = userEvent.setup()
    authState.currentSession = session
    window.history.pushState({}, '', '/app')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Shape your coaching plan.' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Finish setup' }))
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThanOrEqual(5)
    expect(lastProfileUpdate).toBeNull()

    await user.type(screen.getByLabelText('Display name'), 'User A')
    await user.selectOptions(screen.getByLabelText('Experience level'), 'fresh_graduate')
    await user.type(screen.getByLabelText('Target role'), 'Frontend Engineer')
    await user.selectOptions(screen.getByLabelText('Preferred programming language'), 'typescript')
    await user.type(
      screen.getByLabelText('Interview goal'),
      'Practice clearly explaining frontend engineering decisions.',
    )
    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    expect(await screen.findByRole('heading', { name: 'Ready when you are, User A.' })).toBeTruthy()
    expect(lastProfileUpdate).toEqual({
      displayName: 'User A',
      experienceLevel: 'fresh_graduate',
      interviewGoal: 'Practice clearly explaining frontend engineering decisions.',
      preferredLanguage: 'typescript',
      targetRole: 'Frontend Engineer',
    })
  })

  it('clears the authenticated session and returns to sign in on logout', async () => {
    const user = userEvent.setup()
    authState.currentSession = session
    profile = createProfile({
      displayName: 'User A',
      experienceLevel: 'fresh_graduate',
      interviewGoal: 'Prepare for a frontend engineering internship interview.',
      onboardingCompleted: true,
      preferredLanguage: 'typescript',
      targetRole: 'Frontend Engineer',
    })
    window.history.pushState({}, '', '/app')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Ready when you are, User A.' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeTruthy()
    expect(authState.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('renders a useful not-found page', async () => {
    window.history.pushState({}, '', '/missing-page')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'This page is not available.' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /return home/i }).getAttribute('href')).toBe('/')
    await waitFor(() => expect(authState.callback).not.toBeNull())
  })
})
