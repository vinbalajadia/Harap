import { describe, expect, it } from 'vitest'

import {
  candidateResumeContentSchema,
  candidateResumeDataSchema,
  emptyCandidateResumeData,
  resumeSchema,
  resumeUpdateSchema,
} from './resume.js'

const emptyCandidateContent = candidateResumeContentSchema.parse({
  achievements: [],
  education: [],
  experience: [],
  projects: [],
  skills: [],
  summary: '',
  technologies: [],
})

describe('resume contracts', () => {
  it('accepts an empty manually editable candidate profile', () => {
    expect(candidateResumeDataSchema.parse(emptyCandidateResumeData)).toEqual(
      emptyCandidateResumeData,
    )
  })

  it('rejects unexpected ownership fields from resume updates', () => {
    expect(() =>
      resumeUpdateSchema.parse({
        candidateData: emptyCandidateContent,
        userId: '20000000-0000-4000-8000-000000000001',
      }),
    ).toThrow()
  })

  it('reads existing candidate data without fabricating an alignment assessment', () => {
    expect(candidateResumeDataSchema.parse(emptyCandidateContent)).toEqual({
      ...emptyCandidateContent,
      roleAlignment: null,
    })
  })

  it.each(['strong', 'partial', 'low'] as const)(
    'accepts bounded %s evidence alignment',
    (level) => {
      const parsed = candidateResumeDataSchema.parse({
        ...emptyCandidateContent,
        roleAlignment: {
          gaps: level === 'strong' ? [] : ['Limited implementation evidence.'],
          level,
          signals: ['Built a documented technical project.'],
          targetRole: 'Software Engineer',
        },
      })

      expect(parsed.roleAlignment?.level).toBe(level)
    },
  )

  it('rejects excessive or oversized alignment evidence', () => {
    const alignment = {
      gaps: [],
      level: 'partial',
      signals: Array.from({ length: 7 }, (_, index) => `Signal ${index}`),
      targetRole: 'Software Engineer',
    }

    expect(
      candidateResumeDataSchema.safeParse({ ...emptyCandidateContent, roleAlignment: alignment })
        .success,
    ).toBe(false)
    expect(
      candidateResumeDataSchema.safeParse({
        ...emptyCandidateContent,
        roleAlignment: { ...alignment, signals: ['x'.repeat(241)] },
      }).success,
    ).toBe(false)
  })

  it('does not accept browser-authored alignment metadata in candidate updates', () => {
    expect(
      resumeUpdateSchema.safeParse({
        candidateData: {
          ...emptyCandidateContent,
          roleAlignment: {
            gaps: [],
            level: 'strong',
            signals: [],
            targetRole: 'Software Engineer',
          },
        },
      }).success,
    ).toBe(false)
  })

  it('preserves supported date granularity and nullable missing or ambiguous dates', () => {
    const parsed = candidateResumeContentSchema.parse({
      ...emptyCandidateContent,
      education: [
        {
          credential: null,
          endDate: '2023',
          fieldOfStudy: null,
          highlights: [],
          institution: 'Example University',
          startDate: '2021',
        },
      ],
      experience: [
        {
          endDate: 'September 2025',
          highlights: [],
          location: null,
          organization: 'Example Corp',
          role: 'Software Engineer',
          startDate: 'August 2023',
          technologies: [],
        },
        {
          endDate: 'Present',
          highlights: [],
          location: null,
          organization: 'Current Systems',
          role: 'Developer',
          startDate: null,
          technologies: [],
        },
      ],
    })

    expect(parsed.experience[0]).toEqual(
      expect.objectContaining({ endDate: 'September 2025', startDate: 'August 2023' }),
    )
    expect(parsed.experience[1]).toEqual(
      expect.objectContaining({ endDate: 'Present', startDate: null }),
    )
    expect(parsed.education[0]).toEqual(
      expect.objectContaining({ endDate: '2023', startDate: '2021' }),
    )
  })

  it('represents a review-required resume without exposing its storage path', () => {
    const parsed = resumeSchema.parse({
      id: '30000000-0000-4000-8000-000000000001',
      originalFilename: 'synthetic-resume.pdf',
      fileSizeBytes: 2048,
      status: 'review_required',
      candidateData: emptyCandidateResumeData,
      failureCode: null,
      confirmedAt: null,
      lastAnalyzedAt: '2026-08-18T01:00:00.000Z',
      createdAt: '2026-08-18T00:00:00.000Z',
      updatedAt: '2026-08-18T01:00:00.000Z',
    })

    expect(parsed.status).toBe('review_required')
    expect(parsed).not.toHaveProperty('storagePath')
  })
})

describe('resume timestamp validation', () => {
  const baseResume = {
    id: '30000000-0000-4000-8000-000000000002',
    originalFilename: 'synthetic-resume.pdf',
    fileSizeBytes: 1024,
    status: 'uploaded',
    candidateData: null,
    failureCode: null,
    confirmedAt: null,
    lastAnalyzedAt: null,
    createdAt: '2026-08-18T10:58:54.123Z',
    updatedAt: '2026-08-18T10:58:54.123Z',
  }

  it('accepts PostgreSQL offset-aware timestamps (e.g. +00:00 from Supabase)', () => {
    // Supabase/PostgreSQL returns timestamptz as '2026-08-18T10:58:54.123+00:00'.
    // The schema must accept this to survive real database round-trips.
    expect(
      resumeSchema.safeParse({
        ...baseResume,
        createdAt: '2026-08-18T10:58:54.123+00:00',
        updatedAt: '2026-08-18T10:58:54.123+00:00',
      }).success,
    ).toBe(true)
  })

  it('still accepts UTC Z-suffix timestamps', () => {
    expect(
      resumeSchema.safeParse({
        ...baseResume,
        createdAt: '2026-08-18T10:58:54.123Z',
        updatedAt: '2026-08-18T10:58:54.123Z',
      }).success,
    ).toBe(true)
  })

  it('rejects an entirely invalid timestamp string', () => {
    expect(
      resumeSchema.safeParse({
        ...baseResume,
        createdAt: 'not-a-timestamp',
        updatedAt: '2026-08-18T10:58:54.123Z',
      }).success,
    ).toBe(false)
  })

  it('rejects a missing timezone designator', () => {
    // A naive datetime string without offset or Z suffix is not a valid ISO datetime.
    expect(
      resumeSchema.safeParse({
        ...baseResume,
        createdAt: '2026-08-18T10:58:54.123',
        updatedAt: '2026-08-18T10:58:54.123Z',
      }).success,
    ).toBe(false)
  })
})
