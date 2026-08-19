import { z } from 'zod'

import { apiMetaSchema } from './api-envelope.js'
import { targetRoleSchema } from './profile.js'

export const resumeMaxFileSizeBytes = 5 * 1024 * 1024
export const resumePdfMimeType = 'application/pdf'

export const resumeStatuses = [
  'uploaded',
  'processing',
  'review_required',
  'ready',
  'failed',
] as const

export const resumeStatusSchema = z.enum(resumeStatuses)

export const resumeFailureCodes = [
  'empty_pdf',
  'unsupported_pdf',
  'extraction_failed',
  'analysis_failed',
  'analysis_unavailable',
] as const

export const resumeFailureCodeSchema = z.enum(resumeFailureCodes)

const shortTextSchema = z.string().trim().max(160)
const dateLabelSchema = z.string().trim().max(40).nullable()
const highlightsSchema = z.array(z.string().trim().min(1).max(500)).max(8)
const technologiesSchema = z.array(z.string().trim().min(1).max(120)).max(20)
const alignmentEvidenceSchema = z.array(z.string().trim().min(1).max(240)).max(6)

export const roleAlignmentLevels = ['strong', 'partial', 'low'] as const
export const roleAlignmentLevelSchema = z.enum(roleAlignmentLevels)

export const roleAlignmentSchema = z
  .object({
    targetRole: targetRoleSchema,
    level: roleAlignmentLevelSchema,
    signals: alignmentEvidenceSchema,
    gaps: alignmentEvidenceSchema,
  })
  .strict()

export const candidateExperienceSchema = z
  .object({
    role: shortTextSchema,
    organization: shortTextSchema,
    location: shortTextSchema.nullable(),
    startDate: dateLabelSchema,
    endDate: dateLabelSchema,
    highlights: highlightsSchema,
    technologies: technologiesSchema,
  })
  .strict()

export const candidateProjectSchema = z
  .object({
    name: shortTextSchema,
    description: z.string().trim().max(700).nullable(),
    highlights: highlightsSchema,
    technologies: technologiesSchema,
  })
  .strict()

export const candidateEducationSchema = z
  .object({
    institution: shortTextSchema,
    credential: shortTextSchema.nullable(),
    fieldOfStudy: shortTextSchema.nullable(),
    startDate: dateLabelSchema,
    endDate: dateLabelSchema,
    highlights: highlightsSchema,
  })
  .strict()

export const candidateResumeContentSchema = z
  .object({
    summary: z.string().trim().max(1000),
    skills: z.array(z.string().trim().min(1).max(120)).max(40),
    technologies: z.array(z.string().trim().min(1).max(120)).max(40),
    achievements: z.array(z.string().trim().min(1).max(500)).max(20),
    experience: z.array(candidateExperienceSchema).max(15),
    projects: z.array(candidateProjectSchema).max(15),
    education: z.array(candidateEducationSchema).max(10),
  })
  .strict()

export const candidateResumeDataSchema = candidateResumeContentSchema
  .extend({
    roleAlignment: roleAlignmentSchema.nullable().default(null),
  })
  .strict()

export const analyzedCandidateResumeDataSchema = candidateResumeContentSchema
  .extend({
    roleAlignment: roleAlignmentSchema.nullable(),
  })
  .strict()

export const emptyCandidateResumeData = {
  summary: '',
  skills: [],
  technologies: [],
  achievements: [],
  experience: [],
  projects: [],
  education: [],
  roleAlignment: null,
} satisfies CandidateResumeData

export const resumeSchema = z
  .object({
    id: z.string().uuid(),
    originalFilename: z.string().min(1).max(255),
    fileSizeBytes: z.number().int().positive().max(resumeMaxFileSizeBytes),
    status: resumeStatusSchema,
    candidateData: candidateResumeDataSchema.nullable(),
    failureCode: resumeFailureCodeSchema.nullable(),
    confirmedAt: z.iso.datetime({ offset: true }).nullable(),
    lastAnalyzedAt: z.iso.datetime({ offset: true }).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const resumeUpdateSchema = z
  .object({
    candidateData: candidateResumeContentSchema,
  })
  .strict()

export const resumeResponseSchema = z
  .object({
    data: resumeSchema.nullable(),
    meta: apiMetaSchema,
  })
  .strict()

export type CandidateExperience = z.infer<typeof candidateExperienceSchema>
export type CandidateProject = z.infer<typeof candidateProjectSchema>
export type CandidateEducation = z.infer<typeof candidateEducationSchema>
export type CandidateResumeData = z.infer<typeof candidateResumeDataSchema>
export type CandidateResumeContent = z.infer<typeof candidateResumeContentSchema>
export type ResumeStatus = z.infer<typeof resumeStatusSchema>
export type ResumeFailureCode = z.infer<typeof resumeFailureCodeSchema>
export type RoleAlignment = z.infer<typeof roleAlignmentSchema>
export type RoleAlignmentLevel = z.infer<typeof roleAlignmentLevelSchema>
export type Resume = z.infer<typeof resumeSchema>
export type ResumeUpdate = z.infer<typeof resumeUpdateSchema>
export type ResumeResponse = z.infer<typeof resumeResponseSchema>
