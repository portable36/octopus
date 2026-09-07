import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const start = Date.now();
    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }
      const pong = await this.redis.ping();
      const latencyMs = Date.now() - start;
      const isHealthy = pong === 'PONG';
      if (!isHealthy) {
        throw new HealthCheckError(
          'Redis check failed',
          this.getStatus(key, false, { latencyMs, status: this.redis.status }),
        );
      }
      return this.getStatus(key, true, { latencyMs, status: this.redis.status });
    } catch (error) {
      const latencyMs = Date.now() - start;
      const message = error instanceof Error ? error.message : 'Redis check failed';
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message, latencyMs, status: this.redis.status }),
      );
    }
  }
}
