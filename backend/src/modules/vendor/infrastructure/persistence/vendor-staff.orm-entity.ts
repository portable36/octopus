import { Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { VendorStaffRole } from '../../domain/vendor.types';
import { VendorOrmEntity } from './vendor.orm-entity';

@Entity({ tableName: 'vendor_staff' })
@Unique({ properties: ['vendor', 'userId'] })
export class VendorStaffOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => VendorOrmEntity)
  vendor!: VendorOrmEntity;

  @Property({ fieldName: 'user_id', type: 'uuid' })
  userId!: string;

  @Property()
  role!: VendorStaffRole;

  @Property({ fieldName: 'added_at' })
  addedAt!: Date;
}
