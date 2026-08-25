import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'notification_preferences' })
export class NotificationPreferenceOrmEntity {
  @PrimaryKey({ fieldName: 'user_id', type: 'uuid' })
  userId!: string;

  @Property({ fieldName: 'marketing_email' })
  marketingEmail!: boolean;

  @Property({ fieldName: 'marketing_in_app' })
  marketingInApp!: boolean;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}
