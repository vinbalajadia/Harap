import { z } from 'zod'

import { apiMetaSchema } from './api-envelope.js'

export const healthDataSchema = z.object({
  service: z.literal('harap-api'),
  status: z.literal('ok'),
  timestamp: z.iso.datetime(),
  version: z.literal('v1'),
})

export const healthResponseSchema = z.object({
  data: healthDataSchema,
  meta: apiMetaSchema,
})

export type HealthData = z.infer<typeof healthDataSchema>
export type HealthResponse = z.infer<typeof healthResponseSchema>
