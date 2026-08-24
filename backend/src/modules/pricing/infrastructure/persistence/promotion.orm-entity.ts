import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { DiscountType, PromotionScope, PromotionStatus } from '../../domain/pricing.types';

@Entity({ tableName: 'pricing_promotions' })
export class PromotionOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ type: 'string', length: 160 })
  name!: string;

  @Property({ fieldName: 'coupon_code', type: 'string', length: 64, nullable: true })
  couponCode!: string | null;

  @Property({ fieldName: 'discount_type' })
  discountType!: DiscountType;

  @Property({ fieldName: 'discount_value', type: 'integer' })
  discountValue!: number;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ fieldName: 'min_order_amount_minor', type: 'integer' })
  minOrderAmountMinor!: number;

  @Property()
  scope!: PromotionScope;

  @Property({ fieldName: 'scope_ids', type: 'json' })
  scopeIds!: string[];

  @Property({ fieldName: 'usage_limit', type: 'integer', nullable: true })
  usageLimit!: number | null;

  @Property({ fieldName: 'usage_count', type: 'integer' })
  usageCount!: number;

  @Property({ fieldName: 'per_customer_limit', type: 'integer', nullable: true })
  perCustomerLimit!: number | null;

  @Property({ fieldName: 'starts_at' })
  startsAt!: Date;

  @Property({ fieldName: 'ends_at', nullable: true })
  endsAt!: Date | null;

  @Property()
  status!: PromotionStatus;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ tableName: 'pricing_promotion_usages' })
@Unique({ properties: ['idempotencyKey'] })
export class PromotionUsageOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'promotion_id', type: 'uuid' })
  promotionId!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Property({ fieldName: 'order_id', type: 'string', length: 120 })
  orderId!: string;

  @Property({ fieldName: 'idempotency_key', type: 'string', length: 180 })
  idempotencyKey!: string;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
