import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import { SeoDiscoveryModule } from '../seo-discovery/seo-discovery.module';
import { AiPersonalizationModule } from '../ai-personalization/ai-personalization.module';
import { OutboxDispatcherService } from './application/outbox-dispatcher.service';
import { DomainEventsProcessor } from './application/processors/domain-events.processor';
import { MarketingProcessor } from './application/processors/marketing.processor';
import { NotificationProcessor } from './application/processors/notification.processor';
import { SearchIndexingProcessor } from './application/processors/search-indexing.processor';
import { OUTBOX_STORE } from './application/ports/outbox-store.interface';
import { SqlOutboxStoreAdapter } from './infrastructure/persistence/sql-outbox.store.adapter';

@Module({
  imports: [DatabaseModule, RedisModule, SeoDiscoveryModule, AiPersonalizationModule],
  providers: [
    DomainEventsProcessor,
    SearchIndexingProcessor,
    NotificationProcessor,
    MarketingProcessor,
    OutboxDispatcherService,
    {
      provide: OUTBOX_STORE,
      useClass: SqlOutboxStoreAdapter,
    },
  ],
  exports: [OutboxDispatcherService],
})
export class MessagingModule {}
