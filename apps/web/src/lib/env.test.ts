import { describe, expect, it } from 'vitest'

import { webEnvironmentSchema } from './env'

describe('web environment validation', () => {
  it('accepts a same-origin API path for the WSL development proxy', () => {
    const result = webEnvironmentSchema.safeParse({
      VITE_API_URL: '/api/v1',
      VITE_APP_ENV: 'development',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-not-used-for-network-calls',
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
    })

    expect(result.success).toBe(true)
  })

  it('requires public Supabase configuration without including values in errors', () => {
    const result = webEnvironmentSchema.safeParse({
      VITE_API_URL: 'http://localhost:3001/api/v1',
      VITE_APP_ENV: 'production',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']),
      )
    }
  })
})
