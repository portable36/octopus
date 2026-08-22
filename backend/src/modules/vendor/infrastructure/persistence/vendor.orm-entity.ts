import { Collection, Entity, OneToMany, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { VendorStatus } from '../../domain/vendor.types';
import { VendorStaffOrmEntity } from './vendor-staff.orm-entity';

@Entity({ tableName: 'vendors' })
export class VendorOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property()
  @Unique()
  slug!: string;

  @Property({ fieldName: 'display_name' })
  displayName!: string;

  @Property({ type: 'text', nullable: true })
  description: string | null = null;

  @Property({ fieldName: 'legal_name' })
  legalName!: string;

  @Property({ fieldName: 'registration_number', nullable: true })
  registrationNumber: string | null = null;

  @Property({ fieldName: 'tax_id', nullable: true })
  taxId: string | null = null;

  @Property({ fieldName: 'contact_email' })
  contactEmail!: string;

  @Property({ fieldName: 'contact_phone', nullable: true })
  contactPhone: string | null = null;

  @Property({ fieldName: 'address_line', nullable: true })
  addressLine: string | null = null;

  @Property({ nullable: true })
  city: string | null = null;

  @Property({ fieldName: 'country_code' })
  countryCode!: string;

  @Property({ fieldName: 'currency_code' })
  currencyCode!: string;

  @Property()
  timezone!: string;

  @Property({ fieldName: 'accepts_online_orders', default: false })
  acceptsOnlineOrders!: boolean;

  @Property()
  status!: VendorStatus;

  @Property({ fieldName: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Property({ fieldName: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null = null;

  @OneToMany(() => VendorStaffOrmEntity, (staff) => staff.vendor, {
    orphanRemoval: true,
    eager: true,
  })
  staff = new Collection<VendorStaffOrmEntity>(this);

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
