import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type {
  OrderFulfillmentStatus,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
} from '../../domain/order.types';

@Entity({ tableName: 'orders' })
@Unique({ properties: ['idempotencyKey'] })
@Unique({ properties: ['orderNumber'] })
export class OrderOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'order_number', type: 'string', length: 40 })
  orderNumber!: string;

  @Property({ fieldName: 'checkout_id', type: 'uuid' })
  checkoutId!: string;

  @Property({ fieldName: 'idempotency_key', type: 'string', length: 180 })
  idempotencyKey!: string;

  @Property({ fieldName: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ fieldName: 'subtotal_minor', type: 'integer' })
  subtotalMinor!: number;

  @Property({ fieldName: 'discount_minor', type: 'integer' })
  discountMinor!: number;

  @Property({ fieldName: 'shipping_minor', type: 'integer' })
  shippingMinor!: number;

  @Property({ fieldName: 'tax_minor', type: 'integer' })
  taxMinor!: number;

  @Property({ fieldName: 'commission_minor', type: 'integer' })
  commissionMinor!: number;

  @Property({ fieldName: 'total_minor', type: 'integer' })
  totalMinor!: number;

  @Property({ fieldName: 'shipping_method', type: 'string', length: 64 })
  shippingMethod!: string;

  @Property({ fieldName: 'shipping_address_json', type: 'json' })
  shippingAddressJson!: Record<string, unknown>;

  @Property({ fieldName: 'applied_promotion_id', type: 'uuid', nullable: true })
  appliedPromotionId!: string | null;

  @Property({ fieldName: 'applied_coupon_code', type: 'string', length: 64, nullable: true })
  appliedCouponCode!: string | null;

  @Property({ fieldName: 'pricing_snapshot_json', type: 'json' })
  pricingSnapshotJson!: Record<string, unknown>;

  @Property()
  status!: OrderStatus;

  @Property({ fieldName: 'payment_status' })
  paymentStatus!: OrderPaymentStatus;

  @Property({ fieldName: 'fulfillment_status' })
  fulfillmentStatus!: OrderFulfillmentStatus;

  @Property({ fieldName: 'payment_method' })
  paymentMethod!: OrderPaymentMethod;

  /** First/last-touch UTM / click ids captured at checkout (JSON). */
  @Property({ fieldName: 'attribution_json', type: 'json', nullable: true })
  attributionJson!: Record<string, unknown> | null;

  @Property({ type: 'integer' })
  version!: number;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ tableName: 'order_lines' })
@Unique({ properties: ['orderId', 'lineId'] })
export class OrderLineOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'order_id', type: 'uuid' })
  orderId!: string;

  @Property({ fieldName: 'line_id', type: 'string', length: 64 })
  lineId!: string;

  @Property({ fieldName: 'product_id', type: 'uuid' })
  productId!: string;

  @Property({ fieldName: 'variant_id', type: 'uuid' })
  variantId!: string;

  @Property({ fieldName: 'offer_id', type: 'uuid' })
  offerId!: string;

  @Property({ type: 'integer' })
  quantity!: number;

  @Property({ fieldName: 'fulfilled_quantity', type: 'integer' })
  fulfilledQuantity!: number;

  @Property({ fieldName: 'unit_price_minor', type: 'integer' })
  unitPriceMinor!: number;

  @Property({ fieldName: 'line_subtotal_minor', type: 'integer' })
  lineSubtotalMinor!: number;

  @Property({ fieldName: 'line_discount_minor', type: 'integer' })
  lineDiscountMinor!: number;

  @Property({ fieldName: 'line_tax_minor', type: 'integer' })
  lineTaxMinor!: number;

  @Property({ fieldName: 'line_total_minor', type: 'integer' })
  lineTotalMinor!: number;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ fieldName: 'reservation_id', type: 'string', length: 120 })
  reservationId!: string;

  @Property({ fieldName: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;
}
