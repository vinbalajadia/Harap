import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { setAccessToken } from '@/lib/supabase/access-token'
import { supabase } from '@/lib/supabase/client'

import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setAccessToken(nextSession?.access_token ?? null)
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false)
      }
      setIsLoading(false)

      if (event === 'SIGNED_OUT') {
        queryClient.clear()
      }
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isPasswordRecovery,
      session,
      signOut: async () => {
        const { error } = await supabase.auth.signOut({ scope: 'local' })

        if (error !== null) {
          throw new Error('Unable to sign out safely.')
        }

        setAccessToken(null)
        queryClient.clear()
      },
      user: session?.user ?? null,
    }),
    [isLoading, isPasswordRecovery, queryClient, session],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
