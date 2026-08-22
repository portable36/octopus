import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import { RateLimitExceededError } from '../../application/errors/identity.errors';
import type { LoginRateLimiter } from '../../application/ports/login-rate-limiter.interface';

const LOGIN_RATE_PREFIX = 'identity:login-rate:';
const MAX_ATTEMPTS = 20;
const WINDOW_SECONDS = 15 * 60;

@Injectable()
export class RedisLoginRateLimiterAdapter implements LoginRateLimiter {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async assertAllowed(key: string): Promise<void> {
    const attempts = await this.redis.get(this.rateKey(key));
    if (attempts !== null && Number.parseInt(attempts, 10) >= MAX_ATTEMPTS) {
      throw new RateLimitExceededError();
    }
  }

  public async recordFailure(key: string): Promise<void> {
    const redisKey = this.rateKey(key);
    const attempts = await this.redis.incr(redisKey);
    if (attempts === 1) {
      await this.redis.expire(redisKey, WINDOW_SECONDS);
    }
  }

  private rateKey(key: string): string {
    return `${LOGIN_RATE_PREFIX}${key}`;
  }
}
