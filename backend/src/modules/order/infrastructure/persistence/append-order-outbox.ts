import type { EntityManager } from '@mikro-orm/core';
import type { DomainEvent } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { OrderOutboxOrmEntity } from './order-outbox.orm-entity';

export async function appendOrderOutbox(
  tx: EntityManager,
  aggregateId: string,
  events: ReadonlyArray<DomainEvent>,
): Promise<void> {
  for (const event of events) {
    const outbox = new OrderOutboxOrmEntity();
    outbox.id = UniqueID.create().value;
    outbox.aggregateId = aggregateId;
    outbox.eventType = event.eventName;
    outbox.payloadJson = event.payload;
    outbox.eventVersion = 1;
    outbox.createdAt = event.occurredAt;
    outbox.publishedAt = null;
    outbox.retryCount = 0;
    await tx.persist(outbox).flush();
  }
}
