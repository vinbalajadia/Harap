import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './app'

describe('Harap application shell', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              service: 'harap-api',
              status: 'ok',
              timestamp: '2026-08-10T02:30:00.000Z',
              version: 'v1',
            },
            meta: {
              requestId: '0198a7cd-14f8-7000-8000-000000000001',
            },
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 },
        ),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the branded shell and validated API status', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Face every interview with confidence.' }),
    ).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeTruthy()
    expect(await screen.findByText('API online')).toBeTruthy()
  })

  it('provides keyboard-focusable navigation', async () => {
    const user = userEvent.setup()
    render(<App />)

    const homeLink = await screen.findByRole('link', { name: 'Harap home' })
    await user.tab()

    expect(document.activeElement).toBe(homeLink)
  })

  it('renders a useful not-found page', async () => {
    window.history.pushState({}, '', '/missing-page')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'This page is not available.' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /return home/i }).getAttribute('href')).toBe('/')
  })
})
