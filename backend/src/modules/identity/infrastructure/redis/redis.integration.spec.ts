import { randomUUID } from 'node:crypto';
import { HttpException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Redis from 'ioredis';
import { RateLimitExceededError } from '../../application/errors/identity.errors';
import { RedisApiRateLimiterAdapter } from '../../../../shared-kernel/infrastructure/redis/redis-api-rate-limiter.adapter';
import { RedisLoginRateLimiterAdapter } from './redis-login-rate-limiter.adapter';

const redisUrl = process.env.REDIS_URL;

describe.runIf(Boolean(redisUrl))('Redis integration', () => {
  let redis: Redis;

  beforeAll(async () => {
    redis = new Redis(redisUrl as string, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    await redis.connect();
    await redis.ping();
  });

  afterAll(async () => {
    if (!redis) {
      return;
    }
    try {
      if (redis.status === 'ready') {
        await redis.quit();
      } else {
        redis.disconnect();
      }
    } catch {
      // ignore teardown when Redis never connected
    }
  });

  it('login rate limiter blocks after max failures', async () => {
    const limiter = new RedisLoginRateLimiterAdapter(redis);
    const key = `it:${randomUUID()}`;

    await limiter.assertAllowed(key);
    for (let i = 0; i < 20; i += 1) {
      await limiter.recordFailure(key);
    }
    await expect(limiter.assertAllowed(key)).rejects.toBeInstanceOf(RateLimitExceededError);
  });

  it('API rate limiter increments and throws 429 past max', async () => {
    const limiter = new RedisApiRateLimiterAdapter(redis);
    const key = `it:${randomUUID()}`;

    await limiter.consume(key, 3, 60);
    await limiter.consume(key, 3, 60);
    await limiter.consume(key, 3, 60);
    await expect(limiter.consume(key, 3, 60)).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpException && error.getStatus() === 429,
    );
  });
});
