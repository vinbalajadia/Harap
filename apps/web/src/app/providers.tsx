import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type PropsWithChildren } from 'react'

import { createQueryClient } from '@/lib/query-client'
import { AuthProvider } from '@/features/auth/auth-provider'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
