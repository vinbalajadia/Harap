import { LoaderCircle } from 'lucide-react'

export function LoadingScreen({ label = 'Loading Harap' }: { label?: string }) {
  return (
    <div className="grid min-h-[50svh] place-items-center" role="status">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  )
}
