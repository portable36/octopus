import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'checkout_submissions' })
@Unique({ properties: ['idempotencyKey'] })
export class CheckoutSubmissionOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'idempotency_key', type: 'string', length: 180 })
  idempotencyKey!: string;

  @Property({ fieldName: 'request_hash', type: 'string', length: 64 })
  requestHash!: string;

  @Property({ fieldName: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Property({ fieldName: 'guest_token', type: 'string', length: 120, nullable: true })
  guestToken!: string | null;

  @Property({ fieldName: 'cart_id', type: 'uuid' })
  cartId!: string;

  @Property({ fieldName: 'outcome_json', type: 'json', nullable: true })
  outcomeJson!: Record<string, unknown> | null;

  @Property()
  status!: 'IN_PROGRESS' | 'COMPLETED';

  @Property({ fieldName: 'processing_token', type: 'string', length: 64, nullable: true })
  processingToken!: string | null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}

/** Temporary payment intent records until Phase 11 Payment module replaces PaymentPort adapter. */
@Entity({ tableName: 'checkout_payment_intents' })
@Unique({ properties: ['idempotencyKey'] })
export class CheckoutPaymentIntentOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'checkout_id', type: 'uuid' })
  checkoutId!: string;

  @Property({ fieldName: 'idempotency_key', type: 'string', length: 180 })
  idempotencyKey!: string;

  @Property({ fieldName: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Property({ fieldName: 'currency_code', type: 'string', length: 3 })
  currencyCode!: string;

  @Property({ fieldName: 'amount_minor', type: 'integer' })
  amountMinor!: number;

  @Property()
  status!: 'REQUIRES_PAYMENT';

  @Property({ fieldName: 'client_secret', type: 'string', length: 120 })
  clientSecret!: string;

  @Property({ fieldName: 'order_ids_json', type: 'json' })
  orderIdsJson!: string[];

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
