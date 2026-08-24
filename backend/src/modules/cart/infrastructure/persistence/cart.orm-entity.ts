import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { CartStatus } from '../../domain/cart.types';

@Entity({ tableName: 'carts' })
export class CartOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Property({ fieldName: 'guest_token', type: 'string', length: 120, nullable: true })
  guestToken!: string | null;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3, nullable: true })
  currencyCode!: string | null;

  @Property()
  status!: CartStatus;

  @Property({ type: 'integer' })
  version!: number;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ tableName: 'cart_lines' })
@Unique({ properties: ['cartId', 'storeId', 'variantId'] })
export class CartLineOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'cart_id', type: 'uuid' })
  cartId!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'product_id', type: 'uuid' })
  productId!: string;

  @Property({ fieldName: 'variant_id', type: 'uuid' })
  variantId!: string;

  @Property({ fieldName: 'offer_id', type: 'uuid' })
  offerId!: string;

  @Property({ type: 'integer' })
  quantity!: number;

  @Property({ fieldName: 'unit_price_snapshot_minor', type: 'integer' })
  unitPriceSnapshotMinor!: number;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}
