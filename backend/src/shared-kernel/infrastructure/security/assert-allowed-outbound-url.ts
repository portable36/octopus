/**
 * SSRF guard for server-side fetch targets (couriers, future webhooks callers).
 * Host must be on the allowlist; literal private/link-local addresses are rejected.
 */
export class OutboundUrlNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutboundUrlNotAllowedError';
  }
}

const PRIVATE_IPV4_172 = /^172\.(1[6-9]|2\d|3[0-1])\./;

function isBlockedOutboundHost(host: string): boolean {
  if (host === 'localhost' || host === '::1' || host === '[::1]' || host === '0.0.0.0') {
    return true;
  }
  return (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    PRIVATE_IPV4_172.test(host)
  );
}

export function assertAllowedOutboundUrl(
  rawUrl: string,
  allowedHosts: readonly string[],
  options?: { readonly requireHttps?: boolean },
): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new OutboundUrlNotAllowedError('Invalid outbound URL.');
  }

  if (url.username || url.password) {
    throw new OutboundUrlNotAllowedError('Outbound URL must not include credentials.');
  }

  const requireHttps = options?.requireHttps ?? true;
  if (requireHttps && url.protocol !== 'https:') {
    throw new OutboundUrlNotAllowedError('Outbound URL must use https.');
  }
  if (!requireHttps && url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new OutboundUrlNotAllowedError('Outbound URL must use http or https.');
  }

  const host = url.hostname.toLowerCase();
  if (isBlockedOutboundHost(host)) {
    throw new OutboundUrlNotAllowedError('Outbound URL host is not publicly routable.');
  }

  const allow = allowedHosts.map((h) => h.toLowerCase());
  const matched = allow.some((h) => host === h || host.endsWith(`.${h}`));
  if (!matched) {
    throw new OutboundUrlNotAllowedError('Outbound URL host is not allowlisted.');
  }

  return url;
}

export function resolveAllowedBaseUrl(
  candidate: string | undefined,
  fallback: string,
  allowedHosts: readonly string[],
  options?: { readonly requireHttps?: boolean },
): string {
  const raw = (candidate ?? fallback).replace(/\/$/, '');
  assertAllowedOutboundUrl(raw, allowedHosts, options);
  return raw;
}
