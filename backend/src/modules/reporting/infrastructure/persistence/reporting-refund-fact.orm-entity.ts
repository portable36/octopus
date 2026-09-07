import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'reporting_refund_facts' })
@Index({ properties: ['vendorId', 'createdAt'] })
@Index({ properties: ['storeId', 'createdAt'] })
@Index({ properties: ['orderId'] })
export class ReportingRefundFactOrmEntity {
  @PrimaryKey({ fieldName: 'refund_id', type: 'uuid' })
  refundId!: string;

  @Property({ fieldName: 'order_id', type: 'uuid' })
  orderId!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'return_id', type: 'uuid', nullable: true })
  returnId!: string | null;

  @Property({ fieldName: 'amount_minor', type: 'integer' })
  amountMinor!: number;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ fieldName: 'payment_method', type: 'string', length: 32, nullable: true })
  paymentMethod!: string | null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
