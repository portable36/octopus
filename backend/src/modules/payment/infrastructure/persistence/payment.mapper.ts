import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import { PaymentIntentOrmEntity } from './payment.orm-entity';

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
  entity.expiresAt = intent.expiresAt;
  entity.createdAt = intent.createdAt;
  entity.updatedAt = intent.updatedAt;
}
