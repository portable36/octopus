import { describe, expect, it } from 'vitest';
import { PaymentIntent } from './payment-intent.aggregate';
import {
  CodAlreadyCollectedError,
  CodAmountMismatchError,
  CodCancelledError,
  CodNotCollectibleError,
} from '../errors/payment.errors';

describe('PaymentIntent COD', () => {
  it('creates COD intent awaiting collection without clientSecret', () => {
    const intent = PaymentIntent.create({
      checkoutId: 'chk-1',
      orderId: 'ord-1',
      vendorId: 'v-1',
      storeId: 's-1',
      customerId: 'c-1',
      paymentMethod: 'COD',
      amountMinor: 1500,
      currencyCode: 'BDT',
    });
    expect(intent.status).toBe('AWAITING_COLLECTION');
    expect(intent.clientSecret).toBeNull();
    expect(intent.paymentMethod).toBe('COD');
  });

  it('gateway methods return REQUIRES_PAYMENT with clientSecret', () => {
    const intent = PaymentIntent.create({
      checkoutId: 'chk-1',
      orderId: 'ord-1',
      vendorId: 'v-1',
      storeId: 's-1',
      customerId: null,
      paymentMethod: 'SSLCOMMERZ',
      amountMinor: 1500,
      currencyCode: 'BDT',
    });
    expect(intent.status).toBe('REQUIRES_PAYMENT');
    expect(intent.clientSecret).toMatch(/^pi_secret_/);
  });

  it('collects COD once and rejects double collect / cancel after collect', () => {
    const intent = PaymentIntent.create({
      checkoutId: 'chk-1',
      orderId: 'ord-1',
      vendorId: 'v-1',
      storeId: 's-1',
      customerId: 'c-1',
      paymentMethod: 'COD',
      amountMinor: 1500,
      currencyCode: 'BDT',
    });
    intent.markCollected();
    expect(intent.status).toBe('COLLECTED');
    expect(() => intent.markCollected()).toThrow(CodAlreadyCollectedError);
    expect(() => intent.cancel()).toThrow(CodAlreadyCollectedError);
  });

  it('cancel path does not mark collected', () => {
    const intent = PaymentIntent.create({
      checkoutId: 'chk-1',
      orderId: 'ord-1',
      vendorId: 'v-1',
      storeId: 's-1',
      customerId: 'c-1',
      paymentMethod: 'COD',
      amountMinor: 1500,
      currencyCode: 'BDT',
    });
    intent.cancel();
    expect(intent.status).toBe('CANCELLED');
    expect(() => intent.markCollected()).toThrow(CodCancelledError);
  });

  it('rejects collect when not collectible', () => {
    const gateway = PaymentIntent.create({
      checkoutId: 'chk-1',
      orderId: 'ord-1',
      vendorId: 'v-1',
      storeId: 's-1',
      customerId: null,
      paymentMethod: 'BKASH',
      amountMinor: 100,
      currencyCode: 'BDT',
    });
    expect(() => gateway.markCollected()).toThrow(CodNotCollectibleError);
  });
});

// keep unused import referenced for future amount checks in handlers
void CodAmountMismatchError;
