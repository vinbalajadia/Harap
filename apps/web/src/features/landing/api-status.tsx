import { useQuery } from '@tanstack/react-query'

import { fetchHealth } from '@/services/api-client'

export function ApiStatus() {
  const healthQuery = useQuery({
    queryFn: ({ signal }) => fetchHealth(signal),
    queryKey: ['api-health'],
  })

  const label = healthQuery.isPending
    ? 'Checking API…'
    : healthQuery.isError
      ? 'API unavailable'
      : 'API online'

  return (
    <div
      aria-live="polite"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground"
    >
      <span
        aria-hidden="true"
        className={getStatusDotClassName(healthQuery.isPending, healthQuery.isError)}
      />
      <span>{label}</span>
    </div>
  )
}

function getStatusDotClassName(isPending: boolean, isError: boolean): string {
  if (isPending) {
    return 'size-2 rounded-full bg-muted-foreground'
  }

  return isError ? 'size-2 rounded-full bg-destructive' : 'size-2 rounded-full bg-success'
}
