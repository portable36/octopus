import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
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
  CORS_ORIGINS: z.string().default('http://localhost:3001'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(10_000),
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
  OUTBOX_DISPATCH_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().min(500).max(60_000).default(2000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(50),
  OUTBOX_MAX_DISPATCH_RETRIES: z.coerce.number().int().min(1).max(50).default(10),
  LEDGER_SETTLEMENT_DAYS: z.coerce.number().int().min(0).max(365).default(7),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  return parsed.data;
}
