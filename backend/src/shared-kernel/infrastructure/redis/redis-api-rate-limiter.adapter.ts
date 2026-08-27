import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import type { ApiRateLimiter } from '../../application/ports/api-rate-limiter.port';
import { REDIS_CLIENT } from '../redis/redis.constants';

const PREFIX = 'api:rate:';

@Injectable()
export class RedisApiRateLimiterAdapter implements ApiRateLimiter {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async consume(key: string, max: number, windowSeconds: number): Promise<void> {
    const redisKey = `${PREFIX}${key}`;
    const attempts = await this.redis.incr(redisKey);
    if (attempts === 1) {
      await this.redis.expire(redisKey, Math.max(1, windowSeconds));
    }
    if (attempts > max) {
      throw new HttpException(
        {
          message: 'Too many requests. Try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
