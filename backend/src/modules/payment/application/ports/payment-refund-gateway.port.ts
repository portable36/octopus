import type { PaymentMethod, PaymentProvider } from '../../domain/payment.types';

export const PAYMENT_REFUND_GATEWAY = Symbol('PAYMENT_REFUND_GATEWAY');

export interface PaymentRefundGatewayRequest {
  readonly paymentIntentId: string;
  readonly refundId: string;
  readonly provider: PaymentProvider;
  readonly paymentMethod: PaymentMethod;
  readonly method: 'MANUAL' | 'ORIGINAL_PROVIDER';
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly idempotencyKey: string;
}

export interface PaymentRefundGatewayResult {
  readonly ok: boolean;
  readonly providerRefundId: string | null;
  readonly responseCode: string;
  readonly receivedAt: Date;
}

/** Provider adapter for gateway refunds; MANUAL COD completes locally without HTTP. */
export interface PaymentRefundGateway {
  execute(input: PaymentRefundGatewayRequest): Promise<PaymentRefundGatewayResult>;
}
