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
})
