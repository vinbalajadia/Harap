import type { ReactNode } from 'react'

export function AuthMessage({
  children,
  tone = 'error',
}: {
  children: ReactNode
  tone?: 'error' | 'success'
}) {
  return (
    <div
      className={
        tone === 'success'
          ? 'rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success'
          : 'rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground'
      }
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  )
}
