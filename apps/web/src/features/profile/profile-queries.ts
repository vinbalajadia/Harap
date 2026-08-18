import type { ProfileUpdate } from '@harap/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/auth-context'

import { fetchProfile, saveProfile } from './profile-api'

export const profileQueryKey = (userId: string) => ['profile', userId] as const

export function useProfile() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    enabled: userId !== undefined,
    queryFn: fetchProfile,
    queryKey: userId === undefined ? ['profile', 'anonymous'] : profileQueryKey(userId),
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (update: ProfileUpdate) => saveProfile(update),
    onSuccess: (profile) => {
      if (user !== null) {
        queryClient.setQueryData(profileQueryKey(user.id), profile)
      }
    },
  })
}
