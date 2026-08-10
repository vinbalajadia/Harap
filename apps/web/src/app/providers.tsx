import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type PropsWithChildren } from 'react'

import { createQueryClient } from '@/lib/query-client'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient)

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
