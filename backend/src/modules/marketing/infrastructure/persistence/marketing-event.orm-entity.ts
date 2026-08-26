import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'marketing_events' })
export class MarketingEventOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'event_name', type: 'string', length: 64 })
  eventName!: string;

  @Property({ fieldName: 'channel', type: 'string', length: 32 })
  channel!: string;

  @Property({ fieldName: 'transaction_id', type: 'string', length: 80 })
  transactionId!: string;

  @Property({ fieldName: 'event_id', type: 'string', length: 120 })
  eventId!: string;

  @Property({ fieldName: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  @Property({ fieldName: 'status', type: 'string', length: 32 })
  status!: string;

  @Property({ fieldName: 'detail', type: 'text', nullable: true })
  detail!: string | null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
