import { ArrowRight, FileText, Target } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import { useProfile } from '@/features/profile/profile-queries'

export function DashboardPage() {
  const { data: profile } = useProfile()

  return (
    <section>
      <p className="text-sm font-medium text-primary">Harap workspace</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
        Ready when you are
        {profile?.displayName === null || profile?.displayName === undefined
          ? '.'
          : `, ${profile.displayName}.`}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
        Build a grounded candidate context from your resume before interview coaching begins.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-7">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Target aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-5 font-medium">Current target</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {profile?.targetRole ?? 'Complete your profile to set a role.'}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-7">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileText aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-5 font-medium">Resume intelligence</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Upload a private PDF and confirm the skills, projects, and evidence Harap can use.
          </p>
          <Link className={buttonVariants({ className: 'mt-5', size: 'sm' })} to="/app/resume">
            Add resume <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </article>
      </div>
    </section>
  )
}
