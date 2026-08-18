import type { OnboardingProfile } from '@harap/contracts'
import { Navigate, useNavigate } from 'react-router'

import { LoadingScreen } from '@/components/common/loading-screen'

import { ProfileForm } from './components/profile-form'
import { ProfileLoadError } from './components/profile-load-error'
import { useProfile, useUpdateProfile } from './profile-queries'

export function OnboardingPage() {
  const navigate = useNavigate()
  const profileQuery = useProfile()
  const updateProfile = useUpdateProfile()

  if (profileQuery.isPending) return <LoadingScreen label="Preparing onboarding" />
  if (profileQuery.isError) return <ProfileLoadError retry={() => void profileQuery.refetch()} />
  if (profileQuery.data.onboardingCompleted) return <Navigate replace to="/app" />

  const save = async (input: OnboardingProfile) => {
    await updateProfile.mutateAsync(input)
    await navigate('/app', { replace: true })
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Welcome · Profile setup</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Shape your coaching plan.</h1>
        </div>
        <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          1 of 1
        </span>
      </div>
      <p className="mb-8 max-w-2xl leading-7 text-muted-foreground">
        Tell Harap where you are now, the role you are pursuing, and how you prefer to practice. You
        can change these details later.
      </p>
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <ProfileForm
          onSave={save}
          profile={profileQuery.data}
          submitLabel="Finish setup"
          submittingLabel="Saving your plan…"
        />
      </div>
    </section>
  )
}
