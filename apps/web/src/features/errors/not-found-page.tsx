import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

import { AppLogo } from '@/components/common/app-logo'
import { buttonVariants } from '@/components/ui/button-variants'

export function NotFoundPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-5 text-foreground">
      <div className="max-w-md text-center">
        <div className="mb-10 flex justify-center">
          <AppLogo />
        </div>
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">This page is not available.</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          The link may be outdated, or the page may have moved while Harap is being built.
        </p>
        <Link className={`${buttonVariants()} mt-7`} to="/">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Return home
        </Link>
      </div>
    </main>
  )
}
