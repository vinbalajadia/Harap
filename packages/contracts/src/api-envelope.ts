import { z } from 'zod'

export const apiMetaSchema = z.object({
  requestId: z.uuid(),
})

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
  meta: apiMetaSchema,
})

export type ApiMeta = z.infer<typeof apiMetaSchema>
export type ApiError = z.infer<typeof apiErrorSchema>
