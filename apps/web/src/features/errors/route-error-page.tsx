import { Link, isRouteErrorResponse, useRouteError } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'

export function RouteErrorPage() {
  const error = useRouteError()
  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <main className="grid min-h-svh place-items-center bg-background px-5 text-foreground">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-muted-foreground">
          {isNotFound ? '404' : 'Unexpected error'}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {isNotFound ? 'This page is not available.' : 'Harap could not load this page.'}
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Please return home and try again. No private error details are shown here.
        </p>
        <Link className={`${buttonVariants()} mt-7`} to="/">
          Return home
        </Link>
      </div>
    </main>
  )
}
