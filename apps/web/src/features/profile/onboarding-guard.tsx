import { Navigate, Outlet } from 'react-router'

import { LoadingScreen } from '@/components/common/loading-screen'

import { ProfileLoadError } from './components/profile-load-error'
import { useProfile } from './profile-queries'

export function OnboardingGuard() {
  const profileQuery = useProfile()

  if (profileQuery.isPending) return <LoadingScreen label="Loading your profile" />
  if (profileQuery.isError) return <ProfileLoadError retry={() => void profileQuery.refetch()} />
  if (!profileQuery.data.onboardingCompleted) return <Navigate replace to="/app/onboarding" />

  return <Outlet />
}
