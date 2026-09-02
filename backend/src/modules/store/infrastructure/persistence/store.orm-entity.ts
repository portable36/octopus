import { Collection, Entity, OneToMany, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type {
  StoreOpeningHoursEntry,
  StoreOwnershipKind,
  StoreStatus,
  StoreType,
} from '../../domain/store.types';
import { StoreStaffOrmEntity } from './store-staff.orm-entity';

@Entity({ tableName: 'stores' })
@Unique({ properties: ['vendorId', 'slug'] })
@Unique({ properties: ['vendorId', 'storeCode'] })
export class StoreOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_code' })
  storeCode!: string;

  @Property({ fieldName: 'store_type', default: 'online' })
  storeType!: StoreType;

  @Property({ fieldName: 'ownership_kind', default: 'vendor_owned' })
  ownershipKind!: StoreOwnershipKind;

  @Property()
  slug!: string;

  @Property({ fieldName: 'display_name' })
  displayName!: string;

  @Property({ type: 'text', nullable: true })
  description: string | null = null;

  @Property({ nullable: true })
  phone: string | null = null;

  @Property({ nullable: true })
  email: string | null = null;

  @Property({ fieldName: 'support_email', nullable: true })
  supportEmail: string | null = null;

  @Property({ fieldName: 'address_line1', nullable: true })
  addressLine1: string | null = null;

  @Property({ fieldName: 'address_line2', nullable: true })
  addressLine2: string | null = null;

  @Property({ nullable: true })
  city: string | null = null;

  @Property({ nullable: true })
  region: string | null = null;

  @Property({ fieldName: 'postal_code', nullable: true })
  postalCode: string | null = null;

  @Property({ fieldName: 'country_code' })
  countryCode!: string;

  @Property({ type: 'double', nullable: true })
  latitude: number | null = null;

  @Property({ type: 'double', nullable: true })
  longitude: number | null = null;

  @Property({ fieldName: 'opening_hours', type: 'json', nullable: true })
  openingHours: StoreOpeningHoursEntry[] | null = null;

  @Property({ fieldName: 'currency_code' })
  currencyCode!: string;

  @Property()
  timezone!: string;

  @Property()
  locale!: string;

  @Property({ fieldName: 'accepts_online_orders', default: false })
  acceptsOnlineOrders!: boolean;

  @Property({ fieldName: 'cod_enabled', default: false })
  codEnabled!: boolean;

  @Property({ fieldName: 'cod_min_amount_minor', type: 'integer', default: 0 })
  codMinAmountMinor!: number;

  @Property({ fieldName: 'cod_max_amount_minor', type: 'integer', nullable: true })
  codMaxAmountMinor!: number | null;

  @Property({ fieldName: 'cod_reservation_ttl_hours', type: 'integer', default: 72 })
  codReservationTtlHours!: number;

  @Property()
  status!: StoreStatus;

  @OneToMany(() => StoreStaffOrmEntity, (staff) => staff.store, {
    orphanRemoval: true,
    eager: true,
  })
  staff = new Collection<StoreStaffOrmEntity>(this);

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
