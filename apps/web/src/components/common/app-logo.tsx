export function AppLogo() {
  return (
    <span className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-foreground">
      <span className="grid size-8 place-items-center rounded-lg border border-border bg-muted">
        <svg aria-hidden="true" className="size-4" viewBox="0 0 20 20">
          <path
            d="M4.5 3.5v13M15.5 3.5v13M4.5 10h11"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
      </span>
      <span>Harap</span>
    </span>
  )
}
