import { Button } from '@/components/ui/button'

export function ProfileLoadError({ retry }: { retry: () => void }) {
  return (
    <section className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6 text-center">
      <h1 className="text-xl font-semibold">Your profile is temporarily unavailable.</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Harap could not load your onboarding details. Your account is still safe.
      </p>
      <Button className="mt-5" onClick={retry} variant="outline">
        Try again
      </Button>
    </section>
  )
}
