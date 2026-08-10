import { describe, expect, it } from 'vitest'

import { healthResponseSchema } from './health.js'

describe('healthResponseSchema', () => {
  it('accepts a valid health response', () => {
    const result = healthResponseSchema.safeParse({
      data: {
        service: 'harap-api',
        status: 'ok',
        timestamp: '2026-08-10T02:30:00.000Z',
        version: 'v1',
      },
      meta: {
        requestId: '0198a7cd-14f8-7000-8000-000000000001',
      },
    })

    expect(result.success).toBe(true)
  })

  it('rejects a response with an invalid request ID', () => {
    const result = healthResponseSchema.safeParse({
      data: {
        service: 'harap-api',
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
      meta: {
        requestId: 'not-a-uuid',
      },
    })

    expect(result.success).toBe(false)
  })
})
