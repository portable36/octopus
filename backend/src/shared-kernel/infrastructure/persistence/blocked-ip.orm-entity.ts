import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'blocked_ips' })
@Unique({ properties: ['ipCidr'] })
export class BlockedIpOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'ip_cidr', length: 64 })
  ipCidr!: string;

  @Property({ type: 'text', nullable: true })
  reason: string | null = null;

  @Property({ fieldName: 'expires_at', nullable: true })
  expiresAt: Date | null = null;

  @Property({ fieldName: 'is_active' })
  isActive = true;

  @Property({ fieldName: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
