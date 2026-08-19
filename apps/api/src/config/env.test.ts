import { describe, expect, it } from 'vitest'

import { environmentSchema } from './env.js'

describe('API environment validation', () => {
  it('requires both public Supabase configuration values', () => {
    const result = environmentSchema.safeParse({ NODE_ENV: 'production' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining(['SUPABASE_URL', 'SUPABASE_ANON_KEY']),
      )
    }
  })

  it('defaults the OpenAI model to gpt-4o-mini when not specified', () => {
    const result = environmentSchema.safeParse({
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'test-anon-key-not-used-for-network-calls',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.OPENAI_MODEL).toBe('gpt-4o-mini')
    }
  })
})
