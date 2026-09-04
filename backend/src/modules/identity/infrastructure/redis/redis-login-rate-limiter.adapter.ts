import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import { RateLimitExceededError } from '../../application/errors/identity.errors';
import type { LoginRateLimiter } from '../../application/ports/login-rate-limiter.interface';

const LOGIN_RATE_PREFIX = 'identity:login-rate:';
const MAX_ATTEMPTS = 20;
const WINDOW_SECONDS = 15 * 60;

/** Atomic INCR + EXPIRE so concurrent first failures cannot leave a key without TTL. */
const RECORD_FAILURE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return current
`;

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
    await this.redis.eval(
      RECORD_FAILURE_SCRIPT,
      1,
      this.rateKey(key),
      String(WINDOW_SECONDS),
    );
  }

  private rateKey(key: string): string {
    return `${LOGIN_RATE_PREFIX}${key}`;
  }
}
