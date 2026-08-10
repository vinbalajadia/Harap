import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router'

import { AppLogo } from '@/components/common/app-logo'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

import { ApiStatus } from './api-status'

export function LandingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link aria-label="Harap home" to="/">
            <AppLogo />
          </Link>
          <nav aria-label="Primary navigation" className="flex items-center gap-1">
            <a className={buttonVariants({ size: 'sm', variant: 'ghost' })} href="#foundation">
              Foundation
            </a>
            <a className={buttonVariants({ size: 'sm', variant: 'ghost' })} href="#status">
              Status
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-sm text-muted-foreground">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Adaptive interview coaching
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Face every interview with confidence.
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
              Harap is becoming a personal interview mentor that helps aspiring software engineers
              practice, understand their weaknesses, and improve with every session.
            </p>
            <a className={cn(buttonVariants({ size: 'lg' }), 'mt-8')} href="#foundation">
              View the foundation
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          </div>

          <aside
            aria-label="Phase 1 status"
            className="rounded-xl border border-border bg-card p-5 shadow-2xl shadow-black/20"
            id="status"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="font-medium">Foundation ready</p>
                <p className="text-sm text-muted-foreground">Secure, typed, and testable</p>
              </div>
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <ApiStatus />
            </div>
          </aside>
        </section>

        <section className="border-y border-border/80 bg-card/40" id="foundation">
          <div className="mx-auto grid max-w-6xl gap-px px-5 py-10 sm:grid-cols-3 sm:px-8">
            {[
              ['Practice', 'Realistic sessions grounded in your goals and experience.'],
              ['Understand', 'Specific coaching that explains gaps instead of scoring blindly.'],
              ['Improve', 'Progress that carries forward and makes future practice more useful.'],
            ].map(([title, description]) => (
              <article className="py-6 sm:px-6" key={title}>
                <h2 className="font-medium">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>Harap · Built for deliberate practice.</p>
        <p>Phase 1 foundation</p>
      </footer>
    </div>
  )
}
