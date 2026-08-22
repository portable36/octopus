import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * Reference tenant-scoped table used to prove RLS isolation before business modules land.
 * Production vendor/store aggregates replace this pattern in later phases.
 */
@Entity({ tableName: 'tenant_isolation_samples' })
export class TenantIsolationSampleOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid', nullable: true })
  storeId: string | null = null;

  @Property()
  label!: string;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
