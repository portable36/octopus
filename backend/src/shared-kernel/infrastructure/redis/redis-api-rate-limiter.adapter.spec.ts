import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RedisApiRateLimiterAdapter } from './redis-api-rate-limiter.adapter';

describe('RedisApiRateLimiterAdapter', () => {
  it('allows requests while under max', async () => {
    const redis = { eval: vi.fn().mockResolvedValue(2) };
    const limiter = new RedisApiRateLimiterAdapter(redis as never);

    await expect(limiter.consume('checkout:submit:1.2.3.4', 20, 60)).resolves.toBeUndefined();
    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('INCR'"),
      1,
      'api:rate:checkout:submit:1.2.3.4',
      '60',
    );
  });

  it('throws 429 when attempts exceed max', async () => {
    const redis = { eval: vi.fn().mockResolvedValue(21) };
    const limiter = new RedisApiRateLimiterAdapter(redis as never);

    await expect(limiter.consume('payment:refund:9.9.9.9', 20, 60)).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpException && error.getStatus() === 429,
    );
  });

  it('clamps windowSeconds to at least 1', async () => {
    const redis = { eval: vi.fn().mockResolvedValue(1) };
    const limiter = new RedisApiRateLimiterAdapter(redis as never);

    await limiter.consume('media:register:user-1', 30, 0);
    expect(redis.eval).toHaveBeenCalledWith(expect.any(String), 1, 'api:rate:media:register:user-1', '1');
  });
});
