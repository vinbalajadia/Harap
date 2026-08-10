import { apiErrorSchema, healthResponseSchema } from '@harap/contracts'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from './app.js'

describe('Harap API foundation', () => {
  const app = createApp()

  it('returns a contract-valid health response with security headers', async () => {
    const response = await request(app).get('/api/v1/health').expect(200)
    const parsed = healthResponseSchema.parse(response.body)

    expect(response.headers['x-request-id']).toBe(parsed.meta.requestId)
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-powered-by']).toBeUndefined()
  })

  it('returns a safe contract-valid 404 response', async () => {
    const response = await request(app).get('/api/v1/missing').expect(404)
    const parsed = apiErrorSchema.parse(response.body)

    expect(parsed.error.code).toBe('ROUTE_NOT_FOUND')
    expect(JSON.stringify(response.body)).not.toContain('stack')
  })

  it('rejects malformed JSON without exposing internals', async () => {
    const response = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"incomplete":')
      .expect(400)

    const parsed = apiErrorSchema.parse(response.body)
    const serializedBody = JSON.stringify(response.body)

    expect(parsed.error.code).toBe('INVALID_JSON')
    expect(serializedBody).not.toContain('SyntaxError')
    expect(serializedBody).not.toContain('/apps/api')
  })

  it('allows configured origins and rejects unconfigured origins', async () => {
    const allowedResponse = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200)

    expect(allowedResponse.headers['access-control-allow-origin']).toBe('http://localhost:5173')

    const deniedResponse = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://attacker.example')
      .expect(403)

    expect(apiErrorSchema.parse(deniedResponse.body).error.code).toBe('CORS_ORIGIN_DENIED')
    expect(deniedResponse.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('uses a server-generated request ID consistently', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('X-Request-Id', 'client-controlled-value')
      .expect(200)

    const parsed = healthResponseSchema.parse(response.body)

    expect(parsed.meta.requestId).toBe(response.headers['x-request-id'])
    expect(parsed.meta.requestId).not.toBe('client-controlled-value')
  })

  it('rate limits repeated requests with a safe response', async () => {
    const limitedApp = createApp({ rateLimitMax: 2 })

    await request(limitedApp).get('/api/v1/health').expect(200)
    await request(limitedApp).get('/api/v1/health').expect(200)
    const response = await request(limitedApp).get('/api/v1/health').expect(429)

    const parsed = apiErrorSchema.parse(response.body)
    expect(parsed.error.code).toBe('RATE_LIMITED')
    expect(parsed.meta.requestId).toBe(response.headers['x-request-id'])
  })
})
