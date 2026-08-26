import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'order_outbox' })
export class OrderOutboxOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'aggregate_id', type: 'uuid' })
  aggregateId!: string;

  @Property({ fieldName: 'event_type', type: 'string', length: 64 })
  eventType!: string;

  @Property({ fieldName: 'payload_json', type: 'json' })
  payloadJson!: Record<string, unknown>;

  @Property({ fieldName: 'event_version', type: 'integer' })
  eventVersion!: number;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Property({ fieldName: 'retry_count', type: 'integer', default: 0 })
  retryCount = 0;
}
