import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { RegisterStatus } from '../../domain/aggregates/register.aggregate';

@Entity({ tableName: 'pos_registers' })
@Unique({ properties: ['storeId', 'code'] })
export class RegisterOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ length: 32 })
  code!: string;

  @Property({ length: 120 })
  name!: string;

  @Property({ length: 32 })
  status!: RegisterStatus;

  @Property({ type: 'text', nullable: true })
  notes: string | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}
