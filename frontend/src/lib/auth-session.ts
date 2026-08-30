let accessToken: string | null = null;
const listeners = new Set<() => void>();

/** Short-lived access JWT — never put in URL query. Refresh stays HTTP-only cookie. */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  accessToken = token;
  listeners.forEach((listener) => listener());
}

export function clearAccessToken(): void {
  setAccessToken(null);
}

export function subscribeAccessToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
