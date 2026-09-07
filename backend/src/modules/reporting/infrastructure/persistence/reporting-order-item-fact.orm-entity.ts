import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'reporting_order_item_facts' })
@Index({ properties: ['vendorId', 'createdAt'] })
@Index({ properties: ['storeId', 'createdAt'] })
@Index({ properties: ['productId'] })
@Index({ properties: ['variantId'] })
export class ReportingOrderItemFactOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'order_id', type: 'uuid' })
  orderId!: string;

  @Property({ fieldName: 'line_id', type: 'string' })
  lineId!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'product_id', type: 'string' })
  productId!: string;

  @Property({ fieldName: 'variant_id', type: 'string' })
  variantId!: string;

  @Property({ type: 'integer' })
  quantity!: number;

  @Property({ fieldName: 'unit_price_minor', type: 'integer' })
  unitPriceMinor!: number;

  @Property({ fieldName: 'total_minor', type: 'integer' })
  totalMinor!: number;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ fieldName: 'payment_status', type: 'string', length: 40 })
  paymentStatus!: string;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'paid_at', nullable: true })
  paidAt!: Date | null;
}
