import { z } from 'zod';
import {
  gemSchemaVersionSchema,
  gemTrackingEnvironmentSchema,
  metaCapiDataSourceSchema,
  parseMetaAndromedaDataProcessingOptionsList,
} from './meta-gem-env';

export {
  GEM_TRACKING_ENVIRONMENTS,
  META_CAPI_DATA_SOURCES,
  type GemTrackingEnvironment,
  type MetaAndromedaDataProcessingOption,
  type MetaAndromedaPrivacyConfig,
  type MetaCapiDataSource,
  buildMetaAndromedaPrivacyConfig,
  parseMetaAndromedaDataProcessingOptionsList,
} from './meta-gem-env';

const booleanFromEnv = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const gtmContainerIdSchema = z
  .string()
  .regex(/^GTM-[A-Z0-9]+$/, 'GTM container id must match GTM-XXXXXXX');

const ga4MeasurementIdSchema = z
  .string()
  .regex(/^G-[A-Z0-9]+$/, 'GA4 measurement id must match G-XXXXXXXXXX');

const metaAndromedaDataProcessingOptionsSchema = z
  .string()
  .min(2)
  .superRefine((raw, ctx) => {
    try {
      parseMetaAndromedaDataProcessingOptionsList(raw);
    } catch (error) {
      ctx.addIssue({
        code: 'custom',
        message:
          error instanceof Error
            ? error.message
            : 'META_ANDROMEDA_DATA_PROCESSING_OPTIONS is invalid.',
      });
    }
  });

const metaPixelIdSchema = z.string().regex(/^\d+$/, 'Meta pixel id must be numeric');

const metaTestEventCodeSchema = z
  .string()
  .regex(/^TEST\d+$/, 'Meta test event code must match TEST12345 format');

export function normalizeGooglePrivateKeyForValidation(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes('\\n')) {
    return trimmed.replace(/\\n/g, '\n');
  }
  return trimmed;
}

/** Maps APP_URL into SEO_PUBLIC_SITE_URL when the SEO-specific key is unset. */
export function preprocessEnvConfig(config: Record<string, unknown>): Record<string, unknown> {
  const next = { ...config };
  const seoPublicSiteUrl = next.SEO_PUBLIC_SITE_URL;
  const appUrl = next.APP_URL;

  if (
    (seoPublicSiteUrl === undefined ||
      (typeof seoPublicSiteUrl === 'string' && seoPublicSiteUrl.trim() === '')) &&
    typeof appUrl === 'string' &&
    appUrl.trim().length > 0
  ) {
    next.SEO_PUBLIC_SITE_URL = appUrl.trim();
  }

  return next;
}

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Canonical public application / storefront origin (alias for SEO_PUBLIC_SITE_URL). */
  APP_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url(),
  /** MikroORM / pg pool size (tune under load; do not guess beyond observed saturation). */
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).max(100).default(1),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(200).default(10),
  /** Log SQL when a statement takes ≥ this many ms (0 disables). */
  DATABASE_SLOW_QUERY_MS: z.coerce.number().int().min(0).max(60_000).default(500),
  /** Express JSON/urlencoded body size limit (e.g. 1mb). */
  HTTP_BODY_LIMIT: z.string().min(2).max(16).default('1mb'),
  /**
   * Number of trusted reverse-proxy hops for Express `trust proxy`.
   * 0 = use socket address only (local). 1 = single LB/ingress. Too high enables X-Forwarded-For spoofing.
   */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  /** Previous signing secret for overlap during rotation; verify-only. */
  JWT_SECRET_PREVIOUS: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REFRESH_COOKIE_NAME: z.string().default('refresh_token'),
  MEILISEARCH_HOST: z.string().url(),
  MEILISEARCH_API_KEY: z.string().min(1),
  SEARCH_PRODUCTS_INDEX: z.string().min(1).max(128).default('products'),
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  /** Public CDN/base URL for media thumbnails (no trailing slash required). Defaults to S3 endpoint + bucket. */
  MEDIA_PUBLIC_BASE_URL: z.string().url().optional(),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3001')
    .refine(
      (raw) =>
        !raw
          .split(',')
          .map((origin) => origin.trim())
          .includes('*'),
      { message: 'CORS_ORIGINS must not include * when credentials are enabled' },
    ),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(10_000),
  /** Opt-in OpenTelemetry traces + metrics (see otel-bootstrap). */
  OTEL_ENABLED: booleanFromEnv,
  OTEL_SERVICE_NAME: z.string().min(1).max(128).default('octopus-api'),
  /** Base collector URL (e.g. http://localhost:4318) or full …/v1/traces|metrics URL. */
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  /** Opt-in Sentry error reporting (see instrument.ts). */
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().min(1).max(64).optional(),
  SENTRY_RELEASE: z.string().min(1).max(128).optional(),
  COD_DEFAULT_ENABLED: booleanFromEnv,
  COD_MIN_AMOUNT_MINOR: z.coerce.number().int().min(0).default(0),
  COD_MAX_AMOUNT_MINOR: z.coerce.number().int().min(0).optional(),
  COD_RESERVATION_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(72),
  COURIER_CREDENTIALS_KEY: z.string().min(16).optional(),
  STEADFAST_BASE_URL: z.string().url().default('https://portal.packzy.com/api/v1'),
  STEADFAST_API_KEY: z.string().optional(),
  STEADFAST_SECRET_KEY: z.string().optional(),
  PATHAO_BASE_URL: z.string().url().default('https://courier-api-sandbox.pathao.com'),
  PATHAO_CLIENT_ID: z.string().optional(),
  PATHAO_CLIENT_SECRET: z.string().optional(),
  PATHAO_USERNAME: z.string().optional(),
  PATHAO_PASSWORD: z.string().optional(),
  PATHAO_STORE_ID: z.coerce.number().int().positive().optional(),
  COURIER_HTTP_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(15_000),
  /** Extra outbound hosts (comma-separated) for SSRF allowlist; courier env base URLs are always included. */
  OUTBOUND_URL_ALLOWLIST: z.string().optional(),
  OUTBOX_DISPATCH_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  /** When true, this process consumes the seo-discovery BullMQ queue (seo-worker container). */
  SEO_DISCOVERY_WORKER_ENABLED: booleanFromEnv,
  /** When true, this process consumes the ai-personalization BullMQ queue. */
  AI_PERSONALIZATION_WORKER_ENABLED: booleanFromEnv,
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().min(500).max(60_000).default(2000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(50),
  OUTBOX_MAX_DISPATCH_RETRIES: z.coerce.number().int().min(1).max(50).default(10),
  BULLMQ_JOB_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(300_000).default(30_000),
  BULLMQ_CONCURRENCY_DEFAULT: z.coerce.number().int().min(1).max(50).default(5),
  BULLMQ_CONCURRENCY_PAYOUT: z.coerce.number().int().min(1).max(50).default(3),
  BULLMQ_CONCURRENCY_SEARCH: z.coerce.number().int().min(1).max(50).default(3),
  LEDGER_SETTLEMENT_DAYS: z.coerce.number().int().min(0).max(365).default(7),
  /** Canonical public storefront origin for robots/sitemap (no trailing slash required). */
  SEO_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3001'),
  /** Extra robots.txt Disallow paths (comma-separated, e.g. /private,/preview). */
  SEO_ROBOTS_DISALLOW: z.string().default(''),
  /** Local directory for pre-generated sitemap and product feed artifacts. */
  SEO_CACHE_DIR: z.string().min(1).default('.cache/seo'),
  /** HTTP Cache-Control max-age (seconds) for pre-generated sitemap XML responses. */
  SEO_CACHE_TTL_SECONDS: z.coerce.number().int().min(60).max(604_800).default(86_400),
  /** MikroORM batch size when streaming sitemap URL entries during cache generation. */
  SITEMAP_ITEMS_PER_CHUNK: z.coerce.number().int().min(100).max(10_000).default(5000),
  /**
   * Optional platform marketing bootstrap ids (authoritative runtime config also lives in Admin → Marketing).
   * Format-validated when set; never expose secrets to the browser.
   */
  MARKETING_GTM_CONTAINER_ID: gtmContainerIdSchema.optional(),
  MARKETING_GA4_MEASUREMENT_ID: ga4MeasurementIdSchema.optional(),
  /** GA4 Measurement Protocol API secret (server-only). */
  MARKETING_GA4_MP_API_SECRET: z.string().min(1).optional(),
  /** Meta Conversions API pixel id (server-only; seo-discovery outbox path). */
  META_PIXEL_ID: metaPixelIdSchema.optional(),
  /** Meta Conversions API access token (server-only). */
  META_ACCESS_TOKEN: z.string().min(1).optional(),
  /** Meta test event code for staging validation only (never set in production). */
  META_TEST_EVENT_CODE: metaTestEventCodeSchema.optional(),
  /** Meta Andromeda privacy tokens (JSON array string, e.g. ["LDU"] or []). */
  META_ANDROMEDA_DATA_PROCESSING_OPTIONS: metaAndromedaDataProcessingOptionsSchema.optional(),
  /** Meta Andromeda LDU country code (0 when not applicable). */
  META_ANDROMEDA_COUNTRY: z.coerce.number().int().min(0).optional(),
  /** Meta Andromeda LDU state/region code (0 when not applicable). */
  META_ANDROMEDA_STATE: z.coerce.number().int().min(0).optional(),
  /** Meta CAPI event lineage: system_generated (automated) or server (web commerce backend). */
  META_CAPI_DATA_SOURCE: metaCapiDataSourceSchema.optional(),
  /** GEM e-commerce schema version shared with the storefront dataLayer. */
  GEM_SCHEMA_VERSION: gemSchemaVersionSchema.optional(),
  /** GEM tracking environment label shared with the storefront dataLayer. */
  GEM_TRACKING_ENVIRONMENT: gemTrackingEnvironmentSchema.optional(),
  /** Google service account client email for Search Console API (server-only). */
  GOOGLE_SERVICES_CLIENT_EMAIL: z.string().email().optional(),
  /** Google service account private key PEM (server-only; \\n escapes allowed). */
  GOOGLE_SERVICES_PRIVATE_KEY: z.string().min(1).optional(),
});

function requireProductionIntegration(
  env: z.infer<typeof baseEnvSchema>,
  ctx: z.RefinementCtx,
  path: keyof z.infer<typeof baseEnvSchema>,
  message: string,
): void {
  const value = env[path];
  if (value === undefined || value === null || value === '') {
    ctx.addIssue({ code: 'custom', path: [path], message });
  }
}

function assertPairedOptional(
  env: z.infer<typeof baseEnvSchema>,
  ctx: z.RefinementCtx,
  left: keyof z.infer<typeof baseEnvSchema>,
  right: keyof z.infer<typeof baseEnvSchema>,
  label: string,
): void {
  const hasLeft = Boolean(env[left]);
  const hasRight = Boolean(env[right]);
  if (hasLeft !== hasRight) {
    ctx.addIssue({
      code: 'custom',
      path: [left],
      message: `${label}: both variables must be set together or both omitted.`,
    });
  }
}

export const envSchema = baseEnvSchema.superRefine((env, ctx) => {
  assertPairedOptional(env, ctx, 'META_PIXEL_ID', 'META_ACCESS_TOKEN', 'Meta CAPI');
  assertPairedOptional(
    env,
    ctx,
    'GOOGLE_SERVICES_CLIENT_EMAIL',
    'GOOGLE_SERVICES_PRIVATE_KEY',
    'Google Search Console',
  );
  assertPairedOptional(
    env,
    ctx,
    'MARKETING_GA4_MEASUREMENT_ID',
    'MARKETING_GA4_MP_API_SECRET',
    'GA4 Measurement Protocol',
  );

  if (env.GOOGLE_SERVICES_PRIVATE_KEY) {
    const normalized = normalizeGooglePrivateKeyForValidation(env.GOOGLE_SERVICES_PRIVATE_KEY);
    if (!normalized.includes('BEGIN') || !normalized.includes('PRIVATE KEY')) {
      ctx.addIssue({
        code: 'custom',
        path: ['GOOGLE_SERVICES_PRIVATE_KEY'],
        message: 'GOOGLE_SERVICES_PRIVATE_KEY must be a PEM private key.',
      });
    }
  }

  if (env.NODE_ENV !== 'production') {
    return;
  }

  if (env.META_TEST_EVENT_CODE) {
    ctx.addIssue({
      code: 'custom',
      path: ['META_TEST_EVENT_CODE'],
      message: 'META_TEST_EVENT_CODE must not be set in production.',
    });
  }

  if (!env.SEO_PUBLIC_SITE_URL.startsWith('https://')) {
    ctx.addIssue({
      code: 'custom',
      path: ['SEO_PUBLIC_SITE_URL'],
      message: 'Production SEO_PUBLIC_SITE_URL must use HTTPS.',
    });
  }

  if (!env.OUTBOX_DISPATCH_ENABLED) {
    ctx.addIssue({
      code: 'custom',
      path: ['OUTBOX_DISPATCH_ENABLED'],
      message: 'Production requires OUTBOX_DISPATCH_ENABLED=true for BullMQ job dispatch.',
    });
  }

  requireProductionIntegration(
    env,
    ctx,
    'META_PIXEL_ID',
    'Production requires META_PIXEL_ID for Meta Conversions API.',
  );
  requireProductionIntegration(
    env,
    ctx,
    'META_ACCESS_TOKEN',
    'Production requires META_ACCESS_TOKEN for Meta Conversions API.',
  );
  requireProductionIntegration(
    env,
    ctx,
    'GOOGLE_SERVICES_CLIENT_EMAIL',
    'Production requires GOOGLE_SERVICES_CLIENT_EMAIL for Search Console sitemap submission.',
  );
  requireProductionIntegration(
    env,
    ctx,
    'GOOGLE_SERVICES_PRIVATE_KEY',
    'Production requires GOOGLE_SERVICES_PRIVATE_KEY for Search Console sitemap submission.',
  );
  requireProductionIntegration(
    env,
    ctx,
    'META_ANDROMEDA_DATA_PROCESSING_OPTIONS',
    'Production requires META_ANDROMEDA_DATA_PROCESSING_OPTIONS for Meta Andromeda privacy compliance.',
  );
  requireProductionIntegration(
    env,
    ctx,
    'META_ANDROMEDA_COUNTRY',
    'Production requires META_ANDROMEDA_COUNTRY for Meta Andromeda regional privacy.',
  );
  requireProductionIntegration(
    env,
    ctx,
    'META_ANDROMEDA_STATE',
    'Production requires META_ANDROMEDA_STATE for Meta Andromeda regional privacy.',
  );
  requireProductionIntegration(
    env,
    ctx,
    'META_CAPI_DATA_SOURCE',
    'Production requires META_CAPI_DATA_SOURCE (system_generated or server).',
  );
  requireProductionIntegration(
    env,
    ctx,
    'GEM_SCHEMA_VERSION',
    'Production requires GEM_SCHEMA_VERSION for cross-workspace e-commerce event uniformity.',
  );
  requireProductionIntegration(
    env,
    ctx,
    'GEM_TRACKING_ENVIRONMENT',
    'Production requires GEM_TRACKING_ENVIRONMENT for GEM analytics routing.',
  );
});

export type Env = z.infer<typeof envSchema>;

export function formatEnvValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'environment';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(preprocessEnvConfig(config));
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${formatEnvValidationError(parsed.error)}`);
  }
  return parsed.data;
}
