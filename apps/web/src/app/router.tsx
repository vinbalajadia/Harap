import { createBrowserRouter } from 'react-router'

import { LoadingScreen } from '@/components/common/loading-screen'
import { AppLayout } from '@/features/app/app-layout'
import { ProtectedRoute } from '@/features/app/protected-route'
import { PublicOnlyRoute } from '@/features/auth/public-only-route'
import { NotFoundPage } from '@/features/errors/not-found-page'
import { RouteErrorPage } from '@/features/errors/route-error-page'
import { LandingPage } from '@/features/landing/landing-page'
import { OnboardingGuard } from '@/features/profile/onboarding-guard'

export function createAppRouter() {
  return createBrowserRouter([
    {
      HydrateFallback: LoadingScreen,
      errorElement: <RouteErrorPage />,
      children: [
        { Component: LandingPage, path: '/' },
        {
          Component: PublicOnlyRoute,
          children: [
            {
              lazy: async () => ({
                Component: (await import('@/features/auth/login-page')).LoginPage,
              }),
              path: '/login',
            },
            {
              lazy: async () => ({
                Component: (await import('@/features/auth/register-page')).RegisterPage,
              }),
              path: '/register',
            },
            {
              lazy: async () => ({
                Component: (await import('@/features/auth/forgot-password-page'))
                  .ForgotPasswordPage,
              }),
              path: '/forgot-password',
            },
            {
              lazy: async () => ({
                Component: (await import('@/features/auth/check-email-page')).CheckEmailPage,
              }),
              path: '/check-email',
            },
          ],
        },
        {
          lazy: async () => ({
            Component: (await import('@/features/auth/auth-callback-page')).AuthCallbackPage,
          }),
          path: '/auth/callback',
        },
        {
          lazy: async () => ({
            Component: (await import('@/features/auth/reset-password-page')).ResetPasswordPage,
          }),
          path: '/reset-password',
        },
        {
          Component: ProtectedRoute,
          children: [
            {
              Component: AppLayout,
              children: [
                {
                  lazy: async () => ({
                    Component: (await import('@/features/profile/onboarding-page')).OnboardingPage,
                  }),
                  path: '/app/onboarding',
                },
                {
                  Component: OnboardingGuard,
                  children: [
                    {
                      lazy: async () => ({
                        Component: (await import('@/features/app/dashboard-page')).DashboardPage,
                      }),
                      path: '/app',
                    },
                    {
                      lazy: async () => ({
                        Component: (await import('@/features/profile/profile-page')).ProfilePage,
                      }),
                      path: '/app/profile',
                    },
                  ],
                },
              ],
            },
          ],
        },
        { Component: NotFoundPage, path: '*' },
      ],
    },
  ])
}
