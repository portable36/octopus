import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'notifications' })
export class NotificationOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'event_id' })
  eventId!: string;

  @Property({ fieldName: 'recipient_user_id', type: 'uuid' })
  recipientUserId!: string;

  @Property({ fieldName: 'recipient_email', nullable: true })
  recipientEmail: string | null = null;

  @Property({ fieldName: 'notification_type' })
  notificationType!: string;

  @Property()
  channel!: string;

  @Property()
  locale!: string;

  @Property({ fieldName: 'template_key' })
  templateKey!: string;

  @Property({ fieldName: 'template_version' })
  templateVersion!: number;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text' })
  body!: string;

  @Property({ fieldName: 'payload_json', type: 'json' })
  payloadJson: Record<string, unknown> = {};

  @Property({ fieldName: 'delivery_status' })
  deliveryStatus!: string;

  @Property({ fieldName: 'read_at', nullable: true })
  readAt: Date | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
