import type { OnboardingProfile } from '@harap/contracts'
import { useState } from 'react'

import { LoadingScreen } from '@/components/common/loading-screen'

import { ProfileForm } from './components/profile-form'
import { ProfileLoadError } from './components/profile-load-error'
import { useProfile, useUpdateProfile } from './profile-queries'

export function ProfilePage() {
  const profileQuery = useProfile()
  const updateProfile = useUpdateProfile()
  const [saved, setSaved] = useState(false)

  if (profileQuery.isPending) return <LoadingScreen label="Loading your profile" />
  if (profileQuery.isError) return <ProfileLoadError retry={() => void profileQuery.refetch()} />

  const save = async (input: OnboardingProfile) => {
    setSaved(false)
    await updateProfile.mutateAsync(input)
    setSaved(true)
  }

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-sm font-medium text-muted-foreground">Account preferences</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your coaching profile</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
        Keep these details current so future interview practice can match your goals.
      </p>
      <div className="mt-8 rounded-xl border border-border bg-card p-6 sm:p-8">
        <ProfileForm
          onSave={save}
          profile={profileQuery.data}
          submitLabel="Save profile"
          submittingLabel="Saving…"
          successMessage={saved ? 'Your profile has been updated.' : null}
        />
      </div>
    </section>
  )
}
