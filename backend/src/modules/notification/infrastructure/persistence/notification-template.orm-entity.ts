import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'notification_templates' })
export class NotificationTemplateOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'template_key' })
  templateKey!: string;

  @Property()
  channel!: string;

  @Property()
  locale!: string;

  @Property()
  version!: number;

  @Property({ nullable: true, type: 'text' })
  subject: string | null = null;

  @Property({ fieldName: 'body_text', type: 'text' })
  bodyText!: string;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
