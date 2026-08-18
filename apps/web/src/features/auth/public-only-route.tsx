import { Navigate, Outlet, useLocation } from 'react-router'

import { LoadingScreen } from '@/components/common/loading-screen'

import { useAuth } from './auth-context'
import { getSafeAuthDestination } from './auth-redirect'

export function PublicOnlyRoute() {
  const { isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingScreen />
  if (user !== null) return <Navigate replace to={getSafeAuthDestination(location.state)} />

  return <Outlet />
}
