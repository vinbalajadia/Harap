import {
  onboardingProfileSchema,
  resumeUpdateSchema,
  type CandidateResumeContent,
  type CandidateResumeData,
  type Profile,
  type Resume,
  type RoleAlignment,
} from '@harap/contracts'
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
const candidateContent: CandidateResumeContent = {
  achievements: ['Improved a synthetic workflow by 20%.'],
  education: [],
  experience: [],
  projects: [],
  skills: ['Problem solving'],
  summary: 'Synthetic frontend engineer focused on reliable product delivery.',
  technologies: ['TypeScript', 'React'],
}
const candidateData: CandidateResumeData = {
  ...candidateContent,
  roleAlignment: null,
}
const strongAlignment: RoleAlignment = {
  gaps: [],
  level: 'strong',
  signals: ['Built TypeScript services and React applications.'],
  targetRole: 'Software Engineer',
}
const partialAlignment: RoleAlignment = {
  gaps: ['Limited evidence of end-to-end software delivery.'],
  level: 'partial',
  signals: ['Built Python automation and SQL reporting tools.'],
  targetRole: 'Software Engineer',
}
const lowAlignment: RoleAlignment = {
  gaps: ['No software implementation or technical project evidence appears in this resume.'],
  level: 'low',
  signals: ['Documented IT controls and risk assessments.'],
  targetRole: 'Software Engineer',
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

function apiErrorResponse(message: string): Response {
  return new Response(
    JSON.stringify({
      error: { code: 'RESUME_UPDATE_FAILED', message },
      meta: { requestId: '0198a7cd-14f8-7000-8000-000000000001' },
    }),
    { headers: { 'Content-Type': 'application/json' }, status: 503 },
  )
}

function createCandidateResume(
  status: 'ready' | 'review_required',
  roleAlignment: RoleAlignment | null = null,
): Resume {
  return {
    candidateData: { ...candidateData, roleAlignment },
    confirmedAt: status === 'ready' ? '2026-08-18T03:00:00.000Z' : null,
    createdAt: '2026-08-18T01:00:00.000Z',
    failureCode: null,
    fileSizeBytes: 1024,
    id: '80000000-0000-4000-8000-000000000001',
    lastAnalyzedAt: '2026-08-18T02:00:00.000Z',
    originalFilename: 'synthetic-resume.pdf',
    status,
    updatedAt: status === 'ready' ? '2026-08-18T03:00:00.000Z' : '2026-08-18T02:00:00.000Z',
  }
}

function createGate() {
  let release: () => void = () => undefined
  const promise = new Promise<void>((resolve) => {
    release = () => resolve()
  })
  return { promise, release }
}

describe('Harap application flows', () => {
  let profile = createProfile()
  let resume: Resume | null = null
  let analyzedCandidateData: CandidateResumeData = candidateData
  let confirmationGate: Promise<void> | null = null
  let confirmationShouldFail = false
  let lastProfileRequestUrl: string | null = null
  let lastProfileUpdate: unknown = null
  let lastResumeUpdate: unknown = null
  let resumePatchRequests = 0

  beforeEach(() => {
    authState.callback = null
    authState.currentSession = null
    authState.deferInitialEvent = false
    profile = createProfile()
    resume = null
    analyzedCandidateData = candidateData
    confirmationGate = null
    confirmationShouldFail = false
    lastProfileRequestUrl = null
    lastProfileUpdate = null
    lastResumeUpdate = null
    resumePatchRequests = 0
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

        if (url.endsWith('/resume/analyze') && init?.method === 'POST') {
          if (resume === null) return new Response(null, { status: 404 })
          resume = {
            ...resume,
            candidateData: analyzedCandidateData,
            lastAnalyzedAt: '2026-08-18T02:00:00.000Z',
            status: 'review_required',
            updatedAt: '2026-08-18T02:00:00.000Z',
          }
          return apiResponse(resume)
        }

        if (url.endsWith('/resume') && init?.method === 'POST') {
          expect(init.body).toBeInstanceOf(FormData)
          resume = {
            candidateData: null,
            confirmedAt: null,
            createdAt: '2026-08-18T01:00:00.000Z',
            failureCode: null,
            fileSizeBytes: 24,
            id: '80000000-0000-4000-8000-000000000001',
            lastAnalyzedAt: null,
            originalFilename: 'synthetic-resume.pdf',
            status: 'uploaded',
            updatedAt: '2026-08-18T01:00:00.000Z',
          }
          return apiResponse(resume)
        }

        if (url.endsWith('/resume') && init?.method === 'PATCH') {
          resumePatchRequests += 1
          lastResumeUpdate = JSON.parse(String(init.body)) as unknown
          if (resume === null) return new Response(null, { status: 404 })
          if (confirmationGate !== null) await confirmationGate
          if (confirmationShouldFail) {
            return apiErrorResponse('Candidate context could not be saved. Try again.')
          }
          const update = resumeUpdateSchema.parse(lastResumeUpdate)
          resume = {
            ...resume,
            candidateData: {
              ...update.candidateData,
              roleAlignment: resume.candidateData?.roleAlignment ?? null,
            },
            confirmedAt: '2026-08-18T03:00:00.000Z',
            status: 'ready',
            updatedAt: '2026-08-18T03:00:00.000Z',
          }
          return apiResponse(resume)
        }

        if (url.endsWith('/resume') && init?.method === 'DELETE') {
          resume = null
          return new Response(null, { status: 204 })
        }

        if (url.endsWith('/resume')) return apiResponse(resume)

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

  it('uploads, analyzes, reviews, and confirms synthetic candidate context', async () => {
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
    window.history.pushState({}, '', '/app/resume')
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: 'Turn your experience into interview context.',
      }),
    ).toBeTruthy()
    await user.upload(
      screen.getByLabelText('PDF resume'),
      new File(['%PDF-1.7 synthetic'], 'synthetic-resume.pdf', { type: 'application/pdf' }),
    )
    await user.click(screen.getByRole('button', { name: 'Upload and analyze' }))

    expect(
      await screen.findByRole('heading', { name: 'Review your candidate context.' }),
    ).toBeTruthy()
    expect(screen.getByText('Review required')).toBeTruthy()
    expect(screen.getByDisplayValue(candidateData.summary)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Confirm candidate context' }))

    expect(await screen.findByRole('heading', { name: 'Candidate context ready.' })).toBeTruthy()
    expect(screen.queryByText('Review required')).toBeNull()
    expect(screen.getByText('Candidate context confirmed and ready for coaching.')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Candidate context confirmed' }).hasAttribute('disabled'),
    ).toBe(true)
    expect(resumePatchRequests).toBe(1)
    expect(lastResumeUpdate).toEqual({ candidateData: candidateContent })
  })

  it('keeps strong alignment in the normal review flow without a warning', async () => {
    authState.currentSession = session
    profile = createProfile({ onboardingCompleted: true, targetRole: 'Software Engineer' })
    resume = createCandidateResume('review_required', strongAlignment)
    window.history.pushState({}, '', '/app/resume')
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Review your candidate context.' }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm candidate context' })).toBeTruthy()
    expect(screen.queryByText(/This resume .* evidence for Software Engineer\./)).toBeNull()
  })

  it('shows partial career-transition evidence and allows confirmed continuation', async () => {
    const user = userEvent.setup()
    authState.currentSession = session
    profile = createProfile({ onboardingCompleted: true, targetRole: 'Software Engineer' })
    resume = createCandidateResume('review_required', partialAlignment)
    window.history.pushState({}, '', '/app/resume')
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: 'This resume offers some evidence for Software Engineer.',
      }),
    ).toBeTruthy()
    expect(screen.getByText('Built Python automation and SQL reporting tools.')).toBeTruthy()
    expect(screen.getByText('Limited evidence of end-to-end software delivery.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Continue with this resume' }))

    expect(
      screen.queryByRole('heading', {
        name: 'This resume offers some evidence for Software Engineer.',
      }),
    ).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Confirm candidate context' }))
    expect(
      await screen.findByText('Candidate context confirmed and ready for coaching.'),
    ).toBeTruthy()
    expect(resume?.candidateData?.roleAlignment).toEqual(partialAlignment)
  })

  it('shows low alignment as advisory and allows the user to continue anyway', async () => {
    const user = userEvent.setup()
    authState.currentSession = session
    profile = createProfile({ onboardingCompleted: true, targetRole: 'Software Engineer' })
    resume = createCandidateResume('review_required', lowAlignment)
    window.history.pushState({}, '', '/app/resume')
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: 'This resume may offer limited evidence for Software Engineer.',
      }),
    ).toBeTruthy()
    expect(screen.getByText(/not your potential or qualification/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Upload another resume' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Continue anyway' }))

    expect(
      screen.queryByRole('heading', {
        name: 'This resume may offer limited evidence for Software Engineer.',
      }),
    ).toBeNull()
    expect(screen.getByRole('button', { name: 'Confirm candidate context' })).toBeTruthy()
  })

  it('reuses replacement upload and replaces the old alignment assessment', async () => {
    const user = userEvent.setup()
    authState.currentSession = session
    profile = createProfile({ onboardingCompleted: true, targetRole: 'Software Engineer' })
    resume = createCandidateResume('review_required', lowAlignment)
    analyzedCandidateData = { ...candidateData, roleAlignment: strongAlignment }
    window.history.pushState({}, '', '/app/resume')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Upload another resume' }))
    expect(screen.getByRole('heading', { name: 'Replace your resume' })).toBeTruthy()
    await user.upload(
      screen.getByLabelText('PDF resume'),
      new File(['%PDF-1.7 replacement'], 'replacement.pdf', { type: 'application/pdf' }),
    )
    await user.click(screen.getByRole('button', { name: 'Upload and analyze' }))

    expect(
      await screen.findByRole('heading', { name: 'Review your candidate context.' }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('heading', {
        name: 'This resume may offer limited evidence for Software Engineer.',
      }),
    ).toBeNull()
    expect(resume?.candidateData?.roleAlignment).toEqual(strongAlignment)
  })

  it('shows pending confirmation and prevents repeated submissions', async () => {
    const user = userEvent.setup()
    const gate = createGate()
    confirmationGate = gate.promise
    authState.currentSession = session
    profile = createProfile({ onboardingCompleted: true })
    resume = createCandidateResume('review_required')
    window.history.pushState({}, '', '/app/resume')
    render(<App />)

    const confirmButton = await screen.findByRole('button', {
      name: 'Confirm candidate context',
    })
    await user.click(confirmButton)

    expect(await screen.findByText('Saving candidate context…')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Saving context…' }).hasAttribute('disabled')).toBe(
      true,
    )
    await user.click(screen.getByRole('button', { name: 'Saving context…' }))
    expect(resumePatchRequests).toBe(1)

    gate.release()
    expect(
      await screen.findByText('Candidate context confirmed and ready for coaching.'),
    ).toBeTruthy()
    expect(resumePatchRequests).toBe(1)
  })

  it('renders server-confirmed context as ready after a full page load', async () => {
    authState.currentSession = session
    profile = createProfile({ onboardingCompleted: true })
    resume = createCandidateResume('ready', partialAlignment)
    window.history.pushState({}, '', '/app/resume')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Candidate context ready.' })).toBeTruthy()
    expect(screen.queryByText('Review required')).toBeNull()
    expect(screen.getByText('Candidate context confirmed and ready for coaching.')).toBeTruthy()
    expect(
      screen.getByRole('heading', {
        name: 'This resume offers some evidence for Software Engineer.',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Candidate context confirmed' }).hasAttribute('disabled'),
    ).toBe(true)
    expect(resumePatchRequests).toBe(0)
  })

  it('keeps review state on a failed confirmation and allows retry', async () => {
    const user = userEvent.setup()
    confirmationShouldFail = true
    authState.currentSession = session
    profile = createProfile({ onboardingCompleted: true })
    resume = createCandidateResume('review_required')
    window.history.pushState({}, '', '/app/resume')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Confirm candidate context' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Candidate context could not be saved. Try again.',
    )
    expect(screen.getByText('Review required')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Confirm candidate context' }).hasAttribute('disabled'),
    ).toBe(false)

    confirmationShouldFail = false
    await user.click(screen.getByRole('button', { name: 'Confirm candidate context' }))
    expect(
      await screen.findByText('Candidate context confirmed and ready for coaching.'),
    ).toBeTruthy()
    expect(resumePatchRequests).toBe(2)
  })

  it('saves edits to confirmed context without introducing a review state', async () => {
    const user = userEvent.setup()
    authState.currentSession = session
    profile = createProfile({ onboardingCompleted: true })
    resume = createCandidateResume('ready')
    window.history.pushState({}, '', '/app/resume')
    render(<App />)

    const summary = await screen.findByLabelText('Professional summary')
    await user.clear(summary)
    await user.type(summary, 'Updated confirmed candidate context.')

    expect(
      screen.getByText('You have unsaved changes. Save them to update your confirmed context.'),
    ).toBeTruthy()
    expect(screen.queryByText('Review required')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Save candidate context' }))

    expect(
      await screen.findByText('Candidate context confirmed and ready for coaching.'),
    ).toBeTruthy()
    expect(lastResumeUpdate).toEqual({
      candidateData: { ...candidateContent, summary: 'Updated confirmed candidate context.' },
    })
    expect(screen.queryByText('Review required')).toBeNull()
  })

  it('keeps missing and extracted experience and education dates editable', async () => {
    const user = userEvent.setup()
    const datedContent: CandidateResumeContent = {
      ...candidateContent,
      education: [
        {
          credential: 'Bachelor of Science',
          endDate: '2023',
          fieldOfStudy: 'Computer Science',
          highlights: [],
          institution: 'Example University',
          startDate: '2021',
        },
      ],
      experience: [
        {
          endDate: null,
          highlights: [],
          location: null,
          organization: 'Example Corp',
          role: 'Software Engineer',
          startDate: 'August 2023',
          technologies: ['TypeScript'],
        },
      ],
    }
    authState.currentSession = session
    profile = createProfile({ onboardingCompleted: true })
    resume = {
      ...createCandidateResume('ready'),
      candidateData: { ...datedContent, roleAlignment: null },
    }
    window.history.pushState({}, '', '/app/resume')
    render(<App />)

    const startDates = await screen.findAllByLabelText('Start')
    const endDates = screen.getAllByLabelText('End')
    const [experienceStart, educationStart] = startDates
    const [experienceEnd, educationEnd] = endDates
    if (
      !(experienceStart instanceof HTMLInputElement) ||
      !(experienceEnd instanceof HTMLInputElement) ||
      !(educationStart instanceof HTMLInputElement) ||
      !(educationEnd instanceof HTMLInputElement)
    ) {
      throw new Error('Expected editable resume date inputs')
    }
    expect(experienceStart.value).toBe('August 2023')
    expect(experienceEnd.value).toBe('')
    expect(educationStart.value).toBe('2021')
    expect(educationEnd.value).toBe('2023')
    expect(screen.getByRole('button', { name: 'Add role' }).getAttribute('type')).toBe('button')
    expect(screen.getByRole('button', { name: 'Remove role' }).getAttribute('type')).toBe('button')

    await user.type(experienceEnd, 'Present')
    await user.clear(educationStart)
    await user.type(educationStart, '2020')
    await user.click(screen.getByRole('button', { name: 'Save candidate context' }))

    expect(
      await screen.findByText('Candidate context confirmed and ready for coaching.'),
    ).toBeTruthy()
    expect(lastResumeUpdate).toEqual({
      candidateData: {
        ...datedContent,
        education: [{ ...datedContent.education[0], startDate: '2020' }],
        experience: [{ ...datedContent.experience[0], endDate: 'Present' }],
      },
    })
  })

  it('validates file selection and requires confirmation before deleting resume data', async () => {
    const user = userEvent.setup({ applyAccept: false })
    authState.currentSession = session
    profile = createProfile({
      displayName: 'User A',
      experienceLevel: 'fresh_graduate',
      interviewGoal: 'Prepare for a frontend engineering internship interview.',
      onboardingCompleted: true,
      preferredLanguage: 'typescript',
      targetRole: 'Frontend Engineer',
    })
    window.history.pushState({}, '', '/app/resume')
    const view = render(<App />)

    await screen.findByRole('heading', { name: 'Turn your experience into interview context.' })
    await user.upload(
      screen.getByLabelText('PDF resume'),
      new File(['not a pdf'], 'synthetic.txt', { type: 'text/plain' }),
    )
    expect((await screen.findByRole('alert')).textContent).toContain('Choose a PDF file.')

    resume = {
      candidateData,
      confirmedAt: '2026-08-18T03:00:00.000Z',
      createdAt: '2026-08-18T01:00:00.000Z',
      failureCode: null,
      fileSizeBytes: 1024,
      id: '80000000-0000-4000-8000-000000000001',
      lastAnalyzedAt: '2026-08-18T02:00:00.000Z',
      originalFilename: 'synthetic-resume.pdf',
      status: 'ready',
      updatedAt: '2026-08-18T03:00:00.000Z',
    }
    view.unmount()
    window.history.pushState({}, '', '/app/resume')
    render(<App />)
    await screen.findByRole('heading', { name: 'Candidate context ready.' })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Delete resume' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Turn your experience into interview context.',
      }),
    ).toBeTruthy()
  })

  it('renders a useful not-found page', async () => {
    window.history.pushState({}, '', '/missing-page')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'This page is not available.' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /return home/i }).getAttribute('href')).toBe('/')
    await waitFor(() => expect(authState.callback).not.toBeNull())
  })
})
