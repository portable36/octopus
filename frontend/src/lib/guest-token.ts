const GUEST_TOKEN_KEY = 'octopus.guestToken';

/** Stable guest token for cart/checkout headers (local only; never sent as query). */
export function getOrCreateGuestToken(): string {
  if (typeof window === 'undefined') {
    throw new Error('Guest token is browser-only');
  }
  const existing = window.localStorage.getItem(GUEST_TOKEN_KEY)?.trim();
  if (existing && existing.length >= 8) {
    return existing;
  }
  const token =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(GUEST_TOKEN_KEY, token);
  return token;
}

export function guestHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set('x-guest-token', getOrCreateGuestToken());
  return headers;
}
