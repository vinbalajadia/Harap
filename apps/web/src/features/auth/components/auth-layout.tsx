import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router'

import { AppLogo } from '@/components/common/app-logo'

interface AuthLayoutProps extends PropsWithChildren {
  description: string
  footer?: ReactNode
  title: string
}

export function AuthLayout({ children, description, footer, title }: AuthLayoutProps) {
  return (
    <main className="grid min-h-svh place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link aria-label="Harap home" className="mx-auto mb-8 block w-fit" to="/">
          <AppLogo />
        </Link>
        <section className="rounded-xl border border-border bg-card p-6 shadow-2xl shadow-black/20 sm:p-8">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </header>
          <div className="mt-6">{children}</div>
          {footer === undefined ? null : (
            <footer className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
              {footer}
            </footer>
          )}
        </section>
      </div>
    </main>
  )
}
