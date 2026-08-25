import type { PaymentMethod, PaymentProvider } from '../../domain/payment.types';
import { RefundNotRefundableError } from '../../domain/errors/payment.errors';
import type { RefundMethod } from '../../domain/refund.types';

/** COD cash must be collected before any refund; unpaid COD must not mint fake refunds. */
export function resolveRefundMethod(input: {
  readonly paymentMethod: PaymentMethod;
  readonly status: string;
}): RefundMethod {
  if (input.paymentMethod === 'COD') {
    if (input.status !== 'COLLECTED') {
      throw new RefundNotRefundableError(
        'COD refunds require collected cash (no fake refund while awaiting collection).',
      );
    }
    return 'MANUAL';
  }

  // Gateway capture / SUCCEEDED not shipped yet — refuse rather than invent money.
  throw new RefundNotRefundableError(
    `Gateway payment status ${input.status} is not refundable until capture succeeds.`,
  );
}

export function assertCurrencyMatch(intentCurrency: string, requestCurrency: string): string {
  const currency = requestCurrency.trim().toUpperCase();
  if (currency !== intentCurrency) {
    throw new RefundNotRefundableError('Refund currency must match the payment intent.');
  }
  return currency;
}

export type { PaymentProvider };
