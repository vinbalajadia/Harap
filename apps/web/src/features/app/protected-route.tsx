import { Navigate, Outlet, useLocation } from 'react-router'

import { LoadingScreen } from '@/components/common/loading-screen'
import { useAuth } from '@/features/auth/auth-context'

export function ProtectedRoute() {
  const { isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingScreen />

  if (user === null) {
    return (
      <Navigate replace state={{ from: `${location.pathname}${location.search}` }} to="/login" />
    )
  }

  return <Outlet />
}
