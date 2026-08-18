import type { Session, User } from '@supabase/supabase-js'
import { createContext, use } from 'react'

export interface AuthContextValue {
  isLoading: boolean
  isPasswordRecovery: boolean
  session: Session | null
  signOut: () => Promise<void>
  user: User | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = use(AuthContext)

  if (value === null) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return value
}
