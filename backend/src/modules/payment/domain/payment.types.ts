export type PaymentMethod = 'COD' | 'SSLCOMMERZ' | 'BKASH' | 'NAGAD';

export type PaymentIntentStatus =
  'AWAITING_COLLECTION' | 'COLLECTED' | 'REQUIRES_PAYMENT' | 'CANCELLED' | 'FAILED' | 'EXPIRED';

export type PaymentProvider = 'COD' | 'SSLCOMMERZ' | 'BKASH' | 'NAGAD';

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'COD',
  'SSLCOMMERZ',
  'BKASH',
  'NAGAD',
] as const;

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}
