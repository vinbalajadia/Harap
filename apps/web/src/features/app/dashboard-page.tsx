import { ArrowRight, ClipboardCheck, Target } from 'lucide-react'

import { useProfile } from '@/features/profile/profile-queries'

export function DashboardPage() {
  const { data: profile } = useProfile()

  return (
    <section>
      <p className="text-sm font-medium text-muted-foreground">Harap workspace</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        Ready when you are
        {profile?.displayName === null || profile?.displayName === undefined
          ? '.'
          : `, ${profile.displayName}.`}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
        Your account, secure profile, and coaching preferences are ready. Interview sessions arrive
        in the next product phase.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-6">
          <span className="grid size-10 place-items-center rounded-lg bg-muted">
            <Target aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-5 font-medium">Current target</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {profile?.targetRole ?? 'Complete your profile to set a role.'}
          </p>
        </article>
        <article className="rounded-xl border border-border bg-card p-6">
          <span className="grid size-10 place-items-center rounded-lg bg-muted">
            <ClipboardCheck aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-5 font-medium">Practice sessions</h2>
          <p className="mt-2 flex items-center gap-2 text-sm leading-6 text-muted-foreground">
            Coming in Phase 3 <ArrowRight aria-hidden="true" className="size-4" />
          </p>
        </article>
      </div>
    </section>
  )
}
