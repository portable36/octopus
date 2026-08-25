import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type {
  LedgerDirection,
  LedgerEntryType,
  LedgerReferenceType,
} from '../../domain/ledger.types';

@Entity({ tableName: 'vendor_ledger_entries' })
@Unique({ properties: ['idempotencyKey'] })
export class VendorLedgerEntryOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'entry_type', type: 'string', length: 32 })
  entryType!: LedgerEntryType;

  @Property({ type: 'string', length: 8 })
  direction!: LedgerDirection;

  @Property({ fieldName: 'amount_minor', type: 'integer' })
  amountMinor!: number;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ fieldName: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  @Property({ fieldName: 'reference_type', type: 'string', length: 32 })
  referenceType!: LedgerReferenceType;

  @Property({ fieldName: 'reference_id', type: 'string', length: 120 })
  referenceId!: string;

  @Property({ fieldName: 'idempotency_key', type: 'string', length: 180 })
  idempotencyKey!: string;

  @Property({ fieldName: 'available_at' })
  availableAt!: Date;

  @Property({ fieldName: 'occurred_at' })
  occurredAt!: Date;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'metadata_json', type: 'json', nullable: true })
  metadataJson!: Record<string, unknown> | null;
}

@Entity({ tableName: 'vendor_ledger_balances' })
export class VendorLedgerBalanceOrmEntity {
  @PrimaryKey({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ fieldName: 'pending_minor', type: 'integer' })
  pendingMinor!: number;

  @Property({ fieldName: 'available_minor', type: 'integer' })
  availableMinor!: number;

  @Property({ fieldName: 'rebuilt_at' })
  rebuiltAt!: Date;
}

@Entity({ tableName: 'payout_outbox' })
export class PayoutOutboxOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'aggregate_id', type: 'uuid' })
  aggregateId!: string;

  @Property({ fieldName: 'event_type', type: 'string', length: 64 })
  eventType!: string;

  @Property({ fieldName: 'payload_json', type: 'json' })
  payloadJson!: Record<string, unknown>;

  @Property({ fieldName: 'event_version', type: 'integer' })
  eventVersion!: number;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Property({ fieldName: 'retry_count', type: 'integer', default: 0 })
  retryCount = 0;
}
