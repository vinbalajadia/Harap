import { resumeResponseSchema, type CandidateResumeContent, type Resume } from '@harap/contracts'

import {
  authenticatedApiRequest,
  authenticatedApiRequestWithoutResponse,
} from '@/services/api-client'

export async function fetchResume(): Promise<Resume | null> {
  const response = await authenticatedApiRequest('/resume', resumeResponseSchema)
  return response.data
}

export async function uploadResume(file: File): Promise<Resume> {
  const body = new FormData()
  body.append('resume', file)
  const response = await authenticatedApiRequest('/resume', resumeResponseSchema, {
    body,
    method: 'POST',
  })

  if (response.data === null) throw new Error('The upload response did not contain a resume.')
  return response.data
}

export async function analyzeResume(): Promise<Resume> {
  const response = await authenticatedApiRequest('/resume/analyze', resumeResponseSchema, {
    method: 'POST',
  })

  if (response.data === null) throw new Error('The analysis response did not contain a resume.')
  return response.data
}

export async function confirmCandidateData(candidateData: CandidateResumeContent): Promise<Resume> {
  const response = await authenticatedApiRequest('/resume', resumeResponseSchema, {
    body: JSON.stringify({ candidateData }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  })

  if (response.data === null) throw new Error('The update response did not contain a resume.')
  return response.data
}

export function deleteResume(): Promise<void> {
  return authenticatedApiRequestWithoutResponse('/resume', { method: 'DELETE' })
}
