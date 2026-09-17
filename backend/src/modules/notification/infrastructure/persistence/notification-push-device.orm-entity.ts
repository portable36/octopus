import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'notification_push_devices' })
export class NotificationPushDeviceOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'user_id', type: 'uuid' })
  userId!: string;

  @Property({ length: 16 })
  platform!: string;

  @Property({ type: 'text' })
  token!: string;

  @Property({ fieldName: 'token_fingerprint', length: 64 })
  tokenFingerprint!: string;

  @Property({ length: 64, nullable: true })
  label: string | null = null;

  @Property({ fieldName: 'last_seen_at' })
  lastSeenAt!: Date;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'revoked_at', nullable: true })
  revokedAt: Date | null = null;
}
