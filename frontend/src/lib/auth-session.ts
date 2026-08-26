const ACCESS_TOKEN_KEY = 'octopus.accessToken';

/** Short-lived access JWT — never put in URL query. Refresh stays HTTP-only cookie. */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (token) {
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function clearAccessToken(): void {
  setAccessToken(null);
}
