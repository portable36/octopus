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
const GEM_SCHEMA_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const DEFAULT_GEM_SCHEMA_VERSION = '2.4.0';
const GEM_TRACKING_ENVIRONMENTS = ['production', 'staging', 'development'] as const;
const DEFAULT_GEM_TRACKING_ENVIRONMENT = 'production';

/** Public GTM container id (browser-safe). Returns null when unset or invalid. */
export function getPublicGtmId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  if (!raw || !GTM_ID_PATTERN.test(raw)) {
    return null;
  }
  return raw;
}

/** GEM schema version for enhanced e-commerce dataLayer events (must match backend GEM_SCHEMA_VERSION). */
export function getGemSchemaVersion(): string {
  const raw = process.env.NEXT_PUBLIC_GEM_SCHEMA_VERSION?.trim();
  if (!raw || !GEM_SCHEMA_VERSION_PATTERN.test(raw)) {
    return DEFAULT_GEM_SCHEMA_VERSION;
  }
  return raw;
}

/** GEM tracking environment for enhanced e-commerce dataLayer events (must match backend GEM_TRACKING_ENVIRONMENT). */
export function getGemTrackingEnvironment(): (typeof GEM_TRACKING_ENVIRONMENTS)[number] {
  const raw = process.env.NEXT_PUBLIC_GEM_TRACKING_ENVIRONMENT?.trim();
  if (!raw) {
    return DEFAULT_GEM_TRACKING_ENVIRONMENT;
  }
  return (GEM_TRACKING_ENVIRONMENTS as readonly string[]).includes(raw)
    ? (raw as (typeof GEM_TRACKING_ENVIRONMENTS)[number])
    : DEFAULT_GEM_TRACKING_ENVIRONMENT;
}
