import { FileText, LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'

import { AppLogo } from '@/components/common/app-logo'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setSignOutError(null)
    try {
      await signOut()
      await navigate('/login', { replace: true })
    } catch {
      setSignOutError('Harap could not sign you out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 py-2 sm:px-8">
          <Link aria-label="Harap dashboard" to="/app">
            <AppLogo />
          </Link>
          <nav aria-label="Workspace navigation" className="flex items-center gap-1">
            <NavLink
              className={({ isActive }) =>
                cn(
                  buttonVariants({ size: 'sm', variant: 'ghost' }),
                  isActive && 'bg-muted text-foreground',
                )
              }
              to="/app/resume"
            >
              <FileText aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Resume</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                cn(
                  buttonVariants({ size: 'sm', variant: 'ghost' }),
                  isActive && 'bg-muted text-foreground',
                )
              }
              to="/app/profile"
            >
              <UserRound aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Profile</span>
            </NavLink>
            <Button disabled={isSigningOut} onClick={handleSignOut} size="sm" variant="ghost">
              <LogOut aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        {signOutError === null ? null : (
          <p
            className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"
            role="alert"
          >
            {signOutError}
          </p>
        )}
        <Outlet context={{ email: user?.email ?? null }} />
      </main>
    </div>
  )
}
