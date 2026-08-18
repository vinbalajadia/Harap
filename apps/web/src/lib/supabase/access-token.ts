let currentAccessToken: string | null = null

export function getAccessToken(): string | null {
  return currentAccessToken
}

export function setAccessToken(accessToken: string | null): void {
  currentAccessToken = accessToken
}
