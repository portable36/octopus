import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import { OutboxDispatcherService } from './application/outbox-dispatcher.service';
import { DomainEventsProcessor } from './application/processors/domain-events.processor';
import { AnalyticsProcessor } from './application/processors/analytics.processor';
import { MarketingProcessor } from './application/processors/marketing.processor';
import { NotificationProcessor } from './application/processors/notification.processor';
import { SearchIndexingProcessor } from './application/processors/search-indexing.processor';
import { WebhooksProcessor } from './application/processors/webhooks.processor';
import { OUTBOX_STORE } from './application/ports/outbox-store.interface';
import { SqlOutboxStoreAdapter } from './infrastructure/persistence/sql-outbox.store.adapter';

@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [
    DomainEventsProcessor,
    SearchIndexingProcessor,
    NotificationProcessor,
    MarketingProcessor,
    WebhooksProcessor,
    AnalyticsProcessor,
    OutboxDispatcherService,
    {
      provide: OUTBOX_STORE,
      useClass: SqlOutboxStoreAdapter,
    },
  ],
  exports: [OutboxDispatcherService],
})
export class MessagingModule {}
