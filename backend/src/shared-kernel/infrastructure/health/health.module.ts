import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from '../persistence/database.module';
import { RedisModule } from '../redis/redis.module';
import { DatabaseHealthIndicator } from './database.health-indicator';
import { MeilisearchHealthIndicator } from './meilisearch.health-indicator';
import { RedisHealthIndicator } from './redis.health-indicator';
import { HealthController } from '../../presentation/http/health.controller';

@Module({
  imports: [TerminusModule, DatabaseModule, RedisModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, RedisHealthIndicator, MeilisearchHealthIndicator],
  exports: [DatabaseHealthIndicator, RedisHealthIndicator, MeilisearchHealthIndicator],
})
export class HealthModule {}
