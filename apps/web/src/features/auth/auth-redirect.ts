export function getSafeAuthDestination(state: unknown): string {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string' &&
    /^\/app(?:\/|$)/.test(state.from)
  ) {
    return state.from
  }

  return '/app'
}
