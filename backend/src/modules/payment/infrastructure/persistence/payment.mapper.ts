import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import { Refund } from '../../domain/aggregates/refund.aggregate';
import type { RefundMethod, RefundStatus } from '../../domain/refund.types';
import { PaymentIntentOrmEntity, PaymentRefundOrmEntity } from './payment.orm-entity';

export function paymentIntentToDomain(entity: PaymentIntentOrmEntity): PaymentIntent {
  return PaymentIntent.reconstitute(UniqueID.from(entity.id), {
    checkoutId: entity.checkoutId,
    orderId: entity.orderId,
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    customerId: entity.customerId,
    paymentMethod: entity.paymentMethod,
    provider: entity.provider,
    status: entity.status,
    amountMinor: entity.amountMinor,
    currencyCode: entity.currencyCode,
    clientSecret: entity.clientSecret,
    providerTransactionId: entity.providerTransactionId,
    gatewayReferenceId: entity.gatewayReferenceId,
    capturedAt: entity.capturedAt,
    expiresAt: entity.expiresAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function applyPaymentIntentToOrm(
  intent: PaymentIntent,
  entity: PaymentIntentOrmEntity,
): void {
  entity.id = intent.id.value;
  entity.checkoutId = intent.checkoutId;
  entity.orderId = intent.orderId;
  entity.vendorId = intent.vendorId;
  entity.storeId = intent.storeId;
  entity.customerId = intent.customerId;
  entity.paymentMethod = intent.paymentMethod;
  entity.provider = intent.provider;
  entity.status = intent.status;
  entity.amountMinor = intent.amountMinor;
  entity.currencyCode = intent.currencyCode;
  entity.clientSecret = intent.clientSecret;
  entity.providerTransactionId = intent.providerTransactionId;
  entity.gatewayReferenceId = intent.gatewayReferenceId;
  entity.capturedAt = intent.capturedAt;
  entity.expiresAt = intent.expiresAt;
  entity.createdAt = intent.createdAt;
  entity.updatedAt = intent.updatedAt;
}

export function refundToDomain(entity: PaymentRefundOrmEntity): Refund {
  return Refund.reconstitute(UniqueID.from(entity.id), {
    paymentIntentId: entity.paymentIntentId,
    orderId: entity.orderId,
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    returnId: entity.returnId,
    amountMinor: entity.amountMinor,
    currencyCode: entity.currencyCode,
    method: entity.method as RefundMethod,
    status: entity.status as RefundStatus,
    reason: entity.reason,
    providerRefundId: entity.providerRefundId,
    providerResponseCode: entity.providerResponseCode,
    providerReceivedAt: entity.providerReceivedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    completedAt: entity.completedAt,
  });
}

export function applyRefundToOrm(refund: Refund, entity: PaymentRefundOrmEntity): void {
  entity.id = refund.id.value;
  entity.paymentIntentId = refund.paymentIntentId;
  entity.orderId = refund.orderId;
  entity.vendorId = refund.vendorId;
  entity.storeId = refund.storeId;
  entity.returnId = refund.returnId;
  entity.amountMinor = refund.amountMinor;
  entity.currencyCode = refund.currencyCode;
  entity.method = refund.method;
  entity.status = refund.status;
  entity.reason = refund.reason;
  entity.providerRefundId = refund.providerRefundId;
  entity.providerResponseCode = refund.providerResponseCode;
  entity.providerReceivedAt = refund.providerReceivedAt;
  entity.createdAt = refund.createdAt;
  entity.updatedAt = refund.updatedAt;
  entity.completedAt = refund.completedAt;
}
