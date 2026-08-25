import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type {
  PaymentIntentStatus,
  PaymentMethod,
  PaymentProvider,
} from '../../domain/payment.types';

@Entity({ tableName: 'payment_intents' })
export class PaymentIntentOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'checkout_id', type: 'uuid' })
  checkoutId!: string;

  @Property({ fieldName: 'order_id', type: 'uuid' })
  orderId!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Property({ fieldName: 'payment_method' })
  paymentMethod!: PaymentMethod;

  @Property()
  provider!: PaymentProvider;

  @Property()
  status!: PaymentIntentStatus;

  @Property({ fieldName: 'amount_minor', type: 'integer' })
  amountMinor!: number;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ fieldName: 'client_secret', type: 'string', length: 120, nullable: true })
  clientSecret!: string | null;

  @Property({ fieldName: 'expires_at', nullable: true })
  expiresAt!: Date | null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ tableName: 'payment_transactions' })
@Unique({ properties: ['idempotencyKey'] })
export class PaymentTransactionOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'payment_intent_id', type: 'uuid' })
  paymentIntentId!: string;

  @Property({ fieldName: 'order_id', type: 'uuid' })
  orderId!: string;

  @Property({ fieldName: 'collector_user_id', type: 'uuid' })
  collectorUserId!: string;

  @Property({ fieldName: 'amount_minor', type: 'integer' })
  amountMinor!: number;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ type: 'text', nullable: true })
  note!: string | null;

  @Property({ fieldName: 'idempotency_key', type: 'string', length: 180 })
  idempotencyKey!: string;

  @Property({ fieldName: 'collected_at' })
  collectedAt!: Date;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}

@Entity({ tableName: 'payment_operations' })
@Unique({ properties: ['idempotencyKey'] })
export class PaymentOperationOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'idempotency_key', type: 'string', length: 180 })
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

@Entity({ tableName: 'payment_outbox' })
export class PaymentOutboxOrmEntity {
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

@Entity({ tableName: 'payment_refunds' })
export class PaymentRefundOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'payment_intent_id', type: 'uuid' })
  paymentIntentId!: string;

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

  @Property({ type: 'string', length: 32 })
  method!: string;

  @Property({ type: 'string', length: 32 })
  status!: string;

  @Property({ type: 'text', nullable: true })
  reason!: string | null;

  @Property({ fieldName: 'provider_refund_id', type: 'string', length: 180, nullable: true })
  providerRefundId!: string | null;

  @Property({ fieldName: 'provider_response_code', type: 'string', length: 64, nullable: true })
  providerResponseCode!: string | null;

  @Property({ fieldName: 'provider_received_at', nullable: true })
  providerReceivedAt!: Date | null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;

  @Property({ fieldName: 'completed_at', nullable: true })
  completedAt!: Date | null;
}
