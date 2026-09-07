import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import type { ShiftStatus } from '../../domain/aggregates/shift.aggregate';

@Entity({ tableName: 'pos_shifts' })
export class ShiftOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'register_id', type: 'uuid' })
  registerId!: string;

  @Property({ fieldName: 'cashier_id', type: 'uuid' })
  cashierId!: string;

  @Property({ length: 3 })
  currency!: string;

  @Property({ fieldName: 'opening_cash_minor', type: 'bigint' })
  openingCashMinor!: number;

  @Property({ fieldName: 'opening_cash_before_adj_minor', type: 'bigint' })
  openingCashBeforeAdjMinor!: number;

  @Property({ fieldName: 'adj_amount_minor', type: 'bigint', default: 0 })
  adjAmountMinor: number = 0;

  @Property({ fieldName: 'adj_reason', type: 'text', nullable: true })
  adjReason: string | null = null;

  @Property({ fieldName: 'adj_actor_id', type: 'uuid', nullable: true })
  adjActorId: string | null = null;

  @Property({ fieldName: 'cash_sales_minor', type: 'bigint', default: 0 })
  cashSalesMinor: number = 0;

  @Property({ fieldName: 'total_sales_minor', type: 'bigint', default: 0 })
  totalSalesMinor: number = 0;

  @Property({ fieldName: 'non_cash_sales_minor', type: 'bigint', default: 0 })
  nonCashSalesMinor: number = 0;

  @Property({ fieldName: 'cash_in_minor', type: 'bigint', default: 0 })
  cashInMinor: number = 0;

  @Property({ fieldName: 'cash_refunds_minor', type: 'bigint', default: 0 })
  cashRefundsMinor: number = 0;

  @Property({ fieldName: 'cash_out_minor', type: 'bigint', default: 0 })
  cashOutMinor: number = 0;

  @Property({ fieldName: 'actual_cash_minor', type: 'bigint', nullable: true })
  actualCashMinor: number | null = null;

  @Property({ length: 16 })
  status!: ShiftStatus;

  @Property({ fieldName: 'opened_at' })
  openedAt!: Date;

  @Property({ fieldName: 'closed_at', nullable: true })
  closedAt: Date | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}
