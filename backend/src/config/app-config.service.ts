import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.validation';
import { parseDurationToMs, parseDurationToSeconds } from './duration';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  get nodeEnv(): Env['NODE_ENV'] {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  get port(): number {
    return this.configService.get('PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL', { infer: true });
  }

  get databasePoolMin(): number {
    return this.configService.get('DATABASE_POOL_MIN', { infer: true });
  }

  get databasePoolMax(): number {
    return this.configService.get('DATABASE_POOL_MAX', { infer: true });
  }

  get databaseSlowQueryMs(): number {
    return this.configService.get('DATABASE_SLOW_QUERY_MS', { infer: true });
  }

  get httpBodyLimit(): string {
    return this.configService.get('HTTP_BODY_LIMIT', { infer: true });
  }

  get redisUrl(): string {
    return this.configService.get('REDIS_URL', { infer: true });
  }

  get jwtSecret(): string {
    return this.configService.get('JWT_SECRET', { infer: true });
  }

  get jwtExpiresIn(): string {
    return this.configService.get('JWT_EXPIRES_IN', { infer: true });
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true });
  }

  get refreshCookieName(): string {
    return this.configService.get('REFRESH_COOKIE_NAME', { infer: true });
  }

  get accessTokenExpiresInSeconds(): number {
    return parseDurationToSeconds(this.jwtExpiresIn);
  }

  get refreshTokenExpiresInMs(): number {
    return parseDurationToMs(this.jwtRefreshExpiresIn);
  }

  get meilisearchHost(): string {
    return this.configService.get('MEILISEARCH_HOST', { infer: true });
  }

  get meilisearchApiKey(): string {
    return this.configService.get('MEILISEARCH_API_KEY', { infer: true });
  }

  get searchProductsIndex(): string {
    return this.configService.get('SEARCH_PRODUCTS_INDEX', { infer: true });
  }

  get s3Endpoint(): string {
    return this.configService.get('S3_ENDPOINT', { infer: true });
  }

  get s3AccessKey(): string {
    return this.configService.get('S3_ACCESS_KEY', { infer: true });
  }

  get s3SecretKey(): string {
    return this.configService.get('S3_SECRET_KEY', { infer: true });
  }

  get s3Bucket(): string {
    return this.configService.get('S3_BUCKET', { infer: true });
  }

  /** Browser-reachable media base (CDN or MinIO path-style). */
  get mediaPublicBaseUrl(): string {
    const configured = this.configService.get('MEDIA_PUBLIC_BASE_URL', { infer: true });
    if (configured) {
      return configured.replace(/\/$/, '');
    }
    return `${this.s3Endpoint.replace(/\/$/, '')}/${this.s3Bucket}`;
  }

  get logLevel(): Env['LOG_LEVEL'] {
    return this.configService.get('LOG_LEVEL', { infer: true });
  }

  get shutdownTimeoutMs(): number {
    return this.configService.get('SHUTDOWN_TIMEOUT_MS', { infer: true });
  }

  get corsOrigins(): string[] {
    const raw = this.configService.get('CORS_ORIGINS', { infer: true });
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get codDefaultEnabled(): boolean {
    return this.configService.get('COD_DEFAULT_ENABLED', { infer: true });
  }

  get codMinAmountMinor(): number {
    return this.configService.get('COD_MIN_AMOUNT_MINOR', { infer: true });
  }

  get codMaxAmountMinor(): number | null {
    const value = this.configService.get('COD_MAX_AMOUNT_MINOR', { infer: true });
    return value === undefined ? null : value;
  }

  get codReservationTtlHours(): number {
    return this.configService.get('COD_RESERVATION_TTL_HOURS', { infer: true });
  }

  get courierCredentialsKey(): string {
    return this.configService.get('COURIER_CREDENTIALS_KEY', { infer: true }) ?? this.jwtSecret;
  }

  get courierHttpTimeoutMs(): number {
    return this.configService.get('COURIER_HTTP_TIMEOUT_MS', { infer: true });
  }

  get steadfastBaseUrl(): string {
    return this.configService.get('STEADFAST_BASE_URL', { infer: true });
  }

  get steadfastSandboxCredentials(): {
    apiKey: string;
    secretKey: string;
    baseUrl: string;
  } | null {
    const apiKey = this.configService.get('STEADFAST_API_KEY', { infer: true });
    const secretKey = this.configService.get('STEADFAST_SECRET_KEY', { infer: true });
    if (!apiKey || !secretKey) {
      return null;
    }
    return { apiKey, secretKey, baseUrl: this.steadfastBaseUrl };
  }

  get pathaoBaseUrl(): string {
    return this.configService.get('PATHAO_BASE_URL', { infer: true });
  }

  get pathaoSandboxCredentials(): {
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    baseUrl: string;
    pathaoStoreId: number;
  } | null {
    const clientId = this.configService.get('PATHAO_CLIENT_ID', { infer: true });
    const clientSecret = this.configService.get('PATHAO_CLIENT_SECRET', { infer: true });
    const username = this.configService.get('PATHAO_USERNAME', { infer: true });
    const password = this.configService.get('PATHAO_PASSWORD', { infer: true });
    const pathaoStoreId = this.configService.get('PATHAO_STORE_ID', { infer: true });
    if (!clientId || !clientSecret || !username || !password || !pathaoStoreId) {
      return null;
    }
    return {
      clientId,
      clientSecret,
      username,
      password,
      baseUrl: this.pathaoBaseUrl,
      pathaoStoreId,
    };
  }

  get outboxDispatchEnabled(): boolean {
    return this.configService.get('OUTBOX_DISPATCH_ENABLED', { infer: true });
  }

  get outboxPollIntervalMs(): number {
    return this.configService.get('OUTBOX_POLL_INTERVAL_MS', { infer: true });
  }

  get outboxBatchSize(): number {
    return this.configService.get('OUTBOX_BATCH_SIZE', { infer: true });
  }

  get outboxMaxDispatchRetries(): number {
    return this.configService.get('OUTBOX_MAX_DISPATCH_RETRIES', { infer: true });
  }

  get bullmqJobTimeoutMs(): number {
    return this.configService.get('BULLMQ_JOB_TIMEOUT_MS', { infer: true });
  }

  get bullmqConcurrencyDefault(): number {
    return this.configService.get('BULLMQ_CONCURRENCY_DEFAULT', { infer: true });
  }

  get bullmqConcurrencyPayout(): number {
    return this.configService.get('BULLMQ_CONCURRENCY_PAYOUT', { infer: true });
  }

  get bullmqConcurrencySearch(): number {
    return this.configService.get('BULLMQ_CONCURRENCY_SEARCH', { infer: true });
  }

  get ledgerSettlementDays(): number {
    return this.configService.get('LEDGER_SETTLEMENT_DAYS', { infer: true });
  }
}
