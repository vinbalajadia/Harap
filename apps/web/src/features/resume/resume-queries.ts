import type { CandidateResumeContent, Resume } from '@harap/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/auth-context'

import {
  analyzeResume,
  confirmCandidateData,
  deleteResume,
  fetchResume,
  uploadResume,
} from './resume-api'

export const resumeQueryKey = (userId: string) => ['resume', userId] as const

export function useResume() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    enabled: userId !== undefined,
    queryFn: fetchResume,
    queryKey: userId === undefined ? ['resume', 'anonymous'] : resumeQueryKey(userId),
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 1500 : false),
  })
}

function useResumeMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  resumeFromResult?: (result: TResult) => Resume | null,
) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      if (user !== null && resumeFromResult !== undefined) {
        queryClient.setQueryData(resumeQueryKey(user.id), resumeFromResult(result))
      }
    },
    onSettled: async () => {
      if (user !== null) {
        await queryClient.invalidateQueries({ queryKey: resumeQueryKey(user.id) })
      }
    },
  })
}

export function useUploadAndAnalyzeResume() {
  return useResumeMutation(
    async (file: File) => {
      await uploadResume(file)
      return analyzeResume()
    },
    (resume) => resume,
  )
}

export function useAnalyzeResume() {
  return useResumeMutation(
    () => analyzeResume(),
    (resume) => resume,
  )
}

export function useConfirmCandidateData() {
  return useResumeMutation(
    (candidateData: CandidateResumeContent) => confirmCandidateData(candidateData),
    (resume) => resume,
  )
}

export function useDeleteResume() {
  return useResumeMutation(
    () => deleteResume(),
    () => null,
  )
}
