import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.validation';

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

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}
