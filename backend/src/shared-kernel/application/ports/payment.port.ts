export const PAYMENT_PORT = Symbol('PAYMENT_PORT');

export type PaymentMethodDto = 'COD' | 'SSLCOMMERZ' | 'BKASH' | 'NAGAD';

export interface CreatePaymentIntentInput {
  readonly checkoutId: string;
  readonly orderId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly idempotencyKey: string;
  readonly customerId: string | null;
  readonly currencyCode: string;
  readonly amountMinor: number;
  readonly paymentMethod: PaymentMethodDto;
  readonly expiresAt?: Date;
  readonly description?: string;
}

export interface CreatePaymentIntentResult {
  readonly paymentIntentId: string;
  readonly paymentMethod: PaymentMethodDto;
  readonly status: string;
  readonly amountMinor: number;
  readonly currencyCode: string;
  /** Present for gateway methods only — never for COD. */
  readonly clientSecret?: string;
}

export interface ConfirmCodCollectionInput {
  readonly paymentIntentId: string;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly idempotencyKey: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
  readonly note?: string;
}

export interface ConfirmCodCollectionResult {
  readonly paymentIntentId: string;
  readonly orderId: string;
  readonly paymentMethod: 'COD';
  readonly status: 'COLLECTED';
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly collectionId: string;
  readonly collectedAt: string;
}

export interface CancelPaymentIntentInput {
  readonly paymentIntentId: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
  readonly idempotencyKey: string;
}

export interface CodIntentLookupResult {
  readonly paymentIntentId: string;
  readonly orderId: string;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly status: string;
  readonly paymentMethod: 'COD';
}

export interface PaymentPort {
  createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult>;
  confirmCodCollection(input: ConfirmCodCollectionInput): Promise<ConfirmCodCollectionResult>;
  /** Trusted Fulfillment seam — skips staff RBAC; still enforces amount + intent state. */
  confirmCodCollectionFromFulfillment(
    input: Omit<ConfirmCodCollectionInput, 'actorRoles'> & {
      readonly actorRoles?: readonly string[];
    },
  ): Promise<ConfirmCodCollectionResult>;
  cancelIntent(input: CancelPaymentIntentInput): Promise<void>;
  findCodIntentByOrderId(orderId: string): Promise<CodIntentLookupResult | null>;
}
