import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { PayoutStatus } from '../../domain/payout.types';

@Entity({ tableName: 'vendor_payouts' })
@Unique({ properties: ['idempotencyKey'] })
export class VendorPayoutOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'amount_minor', type: 'integer' })
  amountMinor!: number;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ type: 'string', length: 32 })
  status!: PayoutStatus;

  @Property({ fieldName: 'idempotency_key', type: 'string', length: 180 })
  idempotencyKey!: string;

  @Property({ fieldName: 'requested_by_user_id', type: 'uuid' })
  requestedByUserId!: string;

  @Property({ fieldName: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Property({ fieldName: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Property({ fieldName: 'provider_ref', type: 'string', length: 180, nullable: true })
  providerRef!: string | null;

  @Property({ fieldName: 'ledger_entry_id', type: 'uuid', nullable: true })
  ledgerEntryId!: string | null;

  @Property({ fieldName: 'requested_at' })
  requestedAt!: Date;

  @Property({ fieldName: 'reviewed_at', nullable: true })
  reviewedAt!: Date | null;

  @Property({ fieldName: 'approved_at', nullable: true })
  approvedAt!: Date | null;

  @Property({ fieldName: 'processing_at', nullable: true })
  processingAt!: Date | null;

  @Property({ fieldName: 'completed_at', nullable: true })
  completedAt!: Date | null;

  @Property({ fieldName: 'failed_at', nullable: true })
  failedAt!: Date | null;

  @Property({ type: 'integer' })
  version!: number;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}
