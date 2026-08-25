import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { CourierProvider, ShipmentStatus } from '../../domain/fulfillment.types';

@Entity({ tableName: 'shipments' })
@Unique({ properties: ['idempotencyKey'] })
export class ShipmentOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'order_id', type: 'uuid' })
  orderId!: string;

  @Property({ fieldName: 'order_number', type: 'string', length: 40 })
  orderNumber!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property()
  provider!: CourierProvider;

  @Property()
  status!: ShipmentStatus;

  @Property({ fieldName: 'amount_to_collect_minor', type: 'integer' })
  amountToCollectMinor!: number;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ fieldName: 'merchant_order_ref', type: 'string', length: 120 })
  merchantOrderRef!: string;

  @Property({ fieldName: 'provider_consignment_id', type: 'string', length: 120, nullable: true })
  providerConsignmentId!: string | null;

  @Property({ fieldName: 'tracking_code', type: 'string', length: 120, nullable: true })
  trackingCode!: string | null;

  @Property({ fieldName: 'provider_status', type: 'string', length: 64, nullable: true })
  providerStatus!: string | null;

  @Property({ fieldName: 'recipient_json', type: 'json' })
  recipientJson!: Record<string, unknown>;

  @Property({ fieldName: 'item_summary', type: 'text' })
  itemSummary!: string;

  @Property({ fieldName: 'weight_kg', type: 'float' })
  weightKg!: number;

  @Property({ type: 'text', nullable: true })
  note!: string | null;

  @Property({ fieldName: 'idempotency_key', type: 'string', length: 180 })
  idempotencyKey!: string;

  @Property({ type: 'integer' })
  version!: number;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ tableName: 'shipment_lines' })
@Unique({ properties: ['shipmentId', 'orderLineId'] })
export class ShipmentLineOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'shipment_id', type: 'uuid' })
  shipmentId!: string;

  @Property({ fieldName: 'order_line_id', type: 'string', length: 64 })
  orderLineId!: string;

  @Property({ type: 'integer' })
  quantity!: number;
}

@Entity({ tableName: 'courier_accounts' })
@Unique({ properties: ['vendorId', 'provider'] })
export class CourierAccountOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property()
  provider!: CourierProvider;

  /** AES-GCM ciphertext of provider credentials JSON. */
  @Property({ fieldName: 'credentials_cipher', type: 'text' })
  credentialsCipher!: string;

  @Property({ fieldName: 'pathao_store_id', type: 'integer', nullable: true })
  pathaoStoreId!: number | null;

  @Property({ fieldName: 'is_active', default: true })
  isActive!: boolean;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ tableName: 'courier_oauth_tokens' })
@Unique({ properties: ['vendorId', 'provider'] })
export class CourierOauthTokenOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property()
  provider!: CourierProvider;

  @Property({ fieldName: 'access_token_cipher', type: 'text' })
  accessTokenCipher!: string;

  @Property({ fieldName: 'refresh_token_cipher', type: 'text' })
  refreshTokenCipher!: string;

  @Property({ fieldName: 'expires_at' })
  expiresAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ tableName: 'fulfillment_operations' })
@Unique({ properties: ['idempotencyKey'] })
export class FulfillmentOperationOrmEntity {
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

@Entity({ tableName: 'fulfillment_outbox' })
export class FulfillmentOutboxOrmEntity {
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
