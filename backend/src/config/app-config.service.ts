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
}
