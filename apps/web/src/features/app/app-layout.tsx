import { LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'

import { AppLogo } from '@/components/common/app-logo'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { useAuth } from '@/features/auth/auth-context'

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
      <header className="border-b border-border/80 bg-background/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link aria-label="Harap dashboard" to="/app">
            <AppLogo />
          </Link>
          <nav aria-label="Account navigation" className="flex items-center gap-1">
            <Link className={buttonVariants({ size: 'sm', variant: 'ghost' })} to="/app/profile">
              <UserRound aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <Button disabled={isSigningOut} onClick={handleSignOut} size="sm" variant="ghost">
              <LogOut aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
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
