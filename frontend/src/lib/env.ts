const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';
const DEFAULT_SITE_URL = 'http://localhost:3001';

export function getPublicApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export function getPublicAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME ?? 'Octopus';
}

/** Absolute storefront origin for canonical / OG / sitemap (no trailing slash). */
export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
  return raw.replace(/\/$/, '');
}

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

/** Public GTM container id (browser-safe). Returns null when unset or invalid. */
export function getPublicGtmId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  if (!raw || !GTM_ID_PATTERN.test(raw)) {
    return null;
  }
  return raw;
}
