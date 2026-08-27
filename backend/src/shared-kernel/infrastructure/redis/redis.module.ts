import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../../../config/app-config.service';
import { API_RATE_LIMITER } from '../../application/ports/api-rate-limiter.port';
import { attachRedisCommandMetrics } from './attach-redis-command-metrics';
import { REDIS_CLIENT } from './redis.constants';
import { RedisApiRateLimiterAdapter } from './redis-api-rate-limiter.adapter';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): Redis => {
        const client = new Redis(config.redisUrl, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
        });
        return attachRedisCommandMetrics(client);
      },
    },
    {
      provide: API_RATE_LIMITER,
      useClass: RedisApiRateLimiterAdapter,
    },
  ],
  exports: [REDIS_CLIENT, API_RATE_LIMITER],
})
export class RedisModule {}
