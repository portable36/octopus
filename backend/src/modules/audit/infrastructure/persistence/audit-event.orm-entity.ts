import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'audit_events' })
export class AuditEventOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null = null;

  @Property()
  action!: string;

  @Property({ fieldName: 'resource_type' })
  resourceType!: string;

  @Property({ fieldName: 'resource_id', nullable: true })
  resourceId: string | null = null;

  @Property({ fieldName: 'vendor_id', type: 'uuid', nullable: true })
  vendorId: string | null = null;

  @Property({ fieldName: 'store_id', type: 'uuid', nullable: true })
  storeId: string | null = null;

  @Property({ fieldName: 'request_id', nullable: true })
  requestId: string | null = null;

  @Property({ type: 'json', nullable: true })
  before: Record<string, unknown> | null = null;

  @Property({ type: 'json', nullable: true })
  after: Record<string, unknown> | null = null;

  @Property({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
