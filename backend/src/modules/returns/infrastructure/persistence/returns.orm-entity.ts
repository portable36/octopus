import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { ReturnItemCondition, ReturnStatus } from '../../domain/returns.types';

@Entity({ tableName: 'return_requests' })
export class ReturnRequestOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'order_id', type: 'uuid' })
  @Index()
  orderId!: string;

  @Property({ fieldName: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  @Index()
  storeId!: string;

  @Property({ type: 'string', length: 32 })
  status!: ReturnStatus;

  @Property({ fieldName: 'customer_note', type: 'text', nullable: true })
  customerNote!: string | null;

  @Property({ fieldName: 'rejection_reason_code', type: 'string', length: 64, nullable: true })
  rejectionReasonCode!: string | null;

  @Property({ fieldName: 'rejection_note', type: 'text', nullable: true })
  rejectionNote!: string | null;

  @Property({ fieldName: 'items_json', type: 'json' })
  itemsJson!: Record<string, unknown>[];

  @Property({ fieldName: 'inspection_json', type: 'json', nullable: true })
  inspectionJson!: Record<string, unknown> | null;

  @Property({ fieldName: 'requested_at' })
  requestedAt!: Date;

  @Property({ fieldName: 'reviewed_at', nullable: true })
  reviewedAt!: Date | null;

  @Property({ fieldName: 'approved_at', nullable: true })
  approvedAt!: Date | null;

  @Property({ fieldName: 'received_at', nullable: true })
  receivedAt!: Date | null;

  @Property({ fieldName: 'inspected_at', nullable: true })
  inspectedAt!: Date | null;

  @Property({ fieldName: 'completed_at', nullable: true })
  completedAt!: Date | null;

  @Property({ type: 'integer' })
  version!: number;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ tableName: 'return_operations' })
export class ReturnOperationOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'idempotency_key', type: 'string', length: 128 })
  @Unique()
  idempotencyKey!: string;

  @Property({ fieldName: 'operation_type', type: 'string', length: 64 })
  operationType!: string;

  @Property({ fieldName: 'request_hash', type: 'string', length: 64 })
  requestHash!: string;

  @Property({ fieldName: 'response_json', type: 'json' })
  responseJson!: Record<string, unknown>;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}

@Entity({ tableName: 'returns_outbox' })
export class ReturnsOutboxOrmEntity {
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

export type { ReturnItemCondition };
