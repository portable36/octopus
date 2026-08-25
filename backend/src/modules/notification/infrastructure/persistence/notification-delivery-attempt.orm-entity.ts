import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'notification_delivery_attempts' })
export class NotificationDeliveryAttemptOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'notification_id', type: 'uuid' })
  notificationId!: string;

  @Property()
  channel!: string;

  @Property({ fieldName: 'attempt_number' })
  attemptNumber!: number;

  @Property()
  status!: string;

  @Property({ fieldName: 'provider_message_id', nullable: true })
  providerMessageId: string | null = null;

  @Property({ fieldName: 'error_code', nullable: true })
  errorCode: string | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
