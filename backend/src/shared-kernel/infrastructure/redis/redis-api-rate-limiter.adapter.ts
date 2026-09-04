import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import type { ApiRateLimiter } from '../../application/ports/api-rate-limiter.port';
import { REDIS_CLIENT } from '../redis/redis.constants';

const PREFIX = 'api:rate:';

/** Atomic INCR + EXPIRE so concurrent first hits cannot leave a key without TTL. */
const CONSUME_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return current
`;

@Injectable()
export class RedisApiRateLimiterAdapter implements ApiRateLimiter {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async consume(key: string, max: number, windowSeconds: number): Promise<void> {
    const redisKey = `${PREFIX}${key}`;
    const ttl = Math.max(1, windowSeconds);
    const attempts = Number(await this.redis.eval(CONSUME_SCRIPT, 1, redisKey, String(ttl)));
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
