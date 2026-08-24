export const PAYMENT_PORT = Symbol('PAYMENT_PORT');

export interface CreatePaymentIntentInput {
  readonly checkoutId: string;
  readonly idempotencyKey: string;
  readonly orderIds: readonly string[];
  readonly customerId: string | null;
  readonly currencyCode: string;
  readonly amountMinor: number;
  readonly description?: string;
}

export interface CreatePaymentIntentResult {
  readonly paymentIntentId: string;
  readonly status: 'REQUIRES_PAYMENT';
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly clientSecret: string;
}

export interface PaymentPort {
  createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult>;
}
