import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import { OutboxDispatcherService } from './application/outbox-dispatcher.service';
import { DomainEventsProcessor } from './application/processors/domain-events.processor';
import { OUTBOX_STORE } from './application/ports/outbox-store.interface';
import { SqlOutboxStoreAdapter } from './infrastructure/persistence/sql-outbox.store.adapter';

@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [
    DomainEventsProcessor,
    OutboxDispatcherService,
    {
      provide: OUTBOX_STORE,
      useClass: SqlOutboxStoreAdapter,
    },
  ],
  exports: [OutboxDispatcherService],
})
export class MessagingModule {}
