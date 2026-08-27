import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'reporting_order_facts' })
export class ReportingOrderFactOrmEntity {
  @PrimaryKey({ fieldName: 'order_id', type: 'uuid' })
  orderId!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ fieldName: 'total_minor', type: 'integer' })
  totalMinor!: number;

  @Property({ fieldName: 'commission_minor', type: 'integer' })
  commissionMinor!: number;

  @Property()
  status!: string;

  @Property({ fieldName: 'payment_status' })
  paymentStatus!: string;

  @Property({ fieldName: 'payment_method' })
  paymentMethod!: string;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'paid_at', nullable: true })
  paidAt!: Date | null;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}
