import { createBrowserRouter } from 'react-router'

import { NotFoundPage } from '@/features/errors/not-found-page'
import { RouteErrorPage } from '@/features/errors/route-error-page'
import { LandingPage } from '@/features/landing/landing-page'

export function createAppRouter() {
  return createBrowserRouter([
    {
      Component: LandingPage,
      errorElement: <RouteErrorPage />,
      path: '/',
    },
    {
      Component: NotFoundPage,
      path: '*',
    },
  ])
}
