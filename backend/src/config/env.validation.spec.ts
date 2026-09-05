import { describe, expect, it } from 'vitest';
import {
  envSchema,
  formatEnvValidationError,
  normalizeGooglePrivateKeyForValidation,
  preprocessEnvConfig,
  validateEnv,
} from './env.validation';

const productionBase = {
  NODE_ENV: 'production',
  PORT: '3000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/octopus',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'abcdefghijklmnopqrstuvwxyz012345',
  MEILISEARCH_HOST: 'http://localhost:7700',
  MEILISEARCH_API_KEY: 'meili-key',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_ACCESS_KEY: 'minio',
  S3_SECRET_KEY: 'minio123',
  S3_BUCKET: 'octopus',
  CORS_ORIGINS: 'https://shop.example.com',
  SEO_PUBLIC_SITE_URL: 'https://shop.example.com',
  OUTBOX_DISPATCH_ENABLED: 'true',
  META_PIXEL_ID: '123456789012345',
  META_ACCESS_TOKEN: 'meta-token',
  META_ANDROMEDA_DATA_PROCESSING_OPTIONS: '["LDU"]',
  META_ANDROMEDA_COUNTRY: '0',
  META_ANDROMEDA_STATE: '0',
  META_CAPI_DATA_SOURCE: 'server',
  GEM_SCHEMA_VERSION: '2.4.0',
  GEM_TRACKING_ENVIRONMENT: 'production',
  GOOGLE_SERVICES_CLIENT_EMAIL: 'svc@project.iam.gserviceaccount.com',
  GOOGLE_SERVICES_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nLINE\\n-----END PRIVATE KEY-----',
} as const;

describe('env.validation', () => {
  it('accepts a complete production integration profile', () => {
    const env = validateEnv({ ...productionBase });
    expect(env.NODE_ENV).toBe('production');
    expect(env.SEO_PUBLIC_SITE_URL).toBe('https://shop.example.com');
    expect(env.META_PIXEL_ID).toBe('123456789012345');
  });

  it('rejects production when Meta CAPI credentials are missing', () => {
    const result = envSchema.safeParse({
      ...productionBase,
      META_ACCESS_TOKEN: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatEnvValidationError(result.error)).toContain('META_ACCESS_TOKEN');
    }
  });

  it('rejects production when SEO_PUBLIC_SITE_URL is not HTTPS', () => {
    const result = envSchema.safeParse({
      ...productionBase,
      SEO_PUBLIC_SITE_URL: 'http://shop.example.com',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatEnvValidationError(result.error)).toContain('HTTPS');
    }
  });

  it('rejects partially configured Google Search Console credentials', () => {
    const result = envSchema.safeParse({
      ...productionBase,
      GOOGLE_SERVICES_PRIVATE_KEY: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatEnvValidationError(result.error)).toContain('Google Search Console');
    }
  });

  it('normalizes escaped private key newlines before PEM validation', () => {
    const normalized = normalizeGooglePrivateKeyForValidation(
      '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
    );
    expect(normalized).toContain('\nabc\n');
  });

  it('maps APP_URL to SEO_PUBLIC_SITE_URL when SEO key is unset', () => {
    const env = validateEnv({
      ...productionBase,
      SEO_PUBLIC_SITE_URL: undefined,
      APP_URL: 'https://shop.example.com',
    });
    expect(env.SEO_PUBLIC_SITE_URL).toBe('https://shop.example.com');
  });

  it('rejects META_TEST_EVENT_CODE in production', () => {
    const result = envSchema.safeParse(
      preprocessEnvConfig({
        ...productionBase,
        META_TEST_EVENT_CODE: 'TEST12345',
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatEnvValidationError(result.error)).toContain('META_TEST_EVENT_CODE');
    }
  });

  it('accepts META_TEST_EVENT_CODE in non-production environments', () => {
    const env = validateEnv({
      ...productionBase,
      NODE_ENV: 'development',
      META_TEST_EVENT_CODE: 'TEST12345',
    });
    expect(env.META_TEST_EVENT_CODE).toBe('TEST12345');
  });

  it('accepts zero-valued Andromeda country and state in production', () => {
    const env = validateEnv({
      ...productionBase,
      META_ANDROMEDA_COUNTRY: '0',
      META_ANDROMEDA_STATE: '0',
    });
    expect(env.META_ANDROMEDA_COUNTRY).toBe(0);
    expect(env.META_ANDROMEDA_STATE).toBe(0);
  });

  it('rejects invalid META_ANDROMEDA_DATA_PROCESSING_OPTIONS JSON', () => {
    const result = envSchema.safeParse({
      ...productionBase,
      NODE_ENV: 'development',
      META_ANDROMEDA_DATA_PROCESSING_OPTIONS: 'not-json',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid META_CAPI_DATA_SOURCE values', () => {
    const result = envSchema.safeParse({
      ...productionBase,
      NODE_ENV: 'development',
      META_CAPI_DATA_SOURCE: 'browser',
    });
    expect(result.success).toBe(false);
  });

  it('requires Meta Andromeda and GEM keys in production', () => {
    const result = envSchema.safeParse({
      ...productionBase,
      GEM_SCHEMA_VERSION: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatEnvValidationError(result.error)).toContain('GEM_SCHEMA_VERSION');
    }
  });

  it('defaults TRUST_PROXY_HOPS to 0 (socket address only)', () => {
    const env = validateEnv({ ...productionBase });
    expect(env.TRUST_PROXY_HOPS).toBe(0);
  });

  it('accepts TRUST_PROXY_HOPS for a single reverse-proxy hop', () => {
    const env = validateEnv({
      ...productionBase,
      TRUST_PROXY_HOPS: '1',
    });
    expect(env.TRUST_PROXY_HOPS).toBe(1);
  });

  it('validates optional marketing id formats when provided', () => {
    const result = envSchema.safeParse({
      ...productionBase,
      NODE_ENV: 'development',
      MARKETING_GTM_CONTAINER_ID: 'GTM-INVALID SPACE',
    });
    expect(result.success).toBe(false);
  });
});
