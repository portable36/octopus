import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  /** MikroORM / pg pool size (tune under load; do not guess beyond observed saturation). */
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).max(100).default(1),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(200).default(10),
  /** Log SQL when a statement takes ≥ this many ms (0 disables). */
  DATABASE_SLOW_QUERY_MS: z.coerce.number().int().min(0).max(60_000).default(500),
  /** Express JSON/urlencoded body size limit (e.g. 1mb). */
  HTTP_BODY_LIMIT: z.string().min(2).max(16).default('1mb'),
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
  OTEL_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  OTEL_SERVICE_NAME: z.string().min(1).max(128).default('octopus-api'),
  /** Base collector URL (e.g. http://localhost:4318) or full …/v1/traces|metrics URL. */
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  /** Opt-in Sentry error reporting (see instrument.ts). */
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().min(1).max(64).optional(),
  SENTRY_RELEASE: z.string().min(1).max(128).optional(),
  COD_DEFAULT_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
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
    .transform((v) => v === 'true'),
  /** When true, this process consumes the seo-discovery BullMQ queue (seo-worker container). */
  SEO_DISCOVERY_WORKER_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
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
  /** Meta Conversions API pixel id (server-only). */
  META_PIXEL_ID: z.string().min(1).optional(),
  /** Meta Conversions API access token (server-only). */
  META_ACCESS_TOKEN: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  return parsed.data;
}
