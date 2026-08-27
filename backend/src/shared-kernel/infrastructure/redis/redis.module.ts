import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../../../config/app-config.service';
import { attachRedisCommandMetrics } from './attach-redis-command-metrics';
import { REDIS_CLIENT } from './redis.constants';

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
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
