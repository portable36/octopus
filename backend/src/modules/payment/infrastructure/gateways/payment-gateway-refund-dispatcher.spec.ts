import { describe, expect, it, vi } from 'vitest';
import { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import { PaymentGatewayRefundDispatcher } from './payment-gateway-refund-dispatcher';

function makeCapturedIntent(method: 'SSLCOMMERZ' | 'BKASH' | 'NAGAD' = 'BKASH') {
  const intent = PaymentIntent.create({
    checkoutId: 'chk-1',
    orderId: 'ord-1',
    vendorId: 'vendor-1',
    storeId: 'store-1',
    customerId: 'cust-1',
    paymentMethod: method,
    amountMinor: 100000,
    currencyCode: 'BDT',
  });
  intent.markCaptured('TRX_ORIGINAL_123');
  return intent;
}

describe('PaymentGatewayRefundDispatcher', () => {
  it('processes MANUAL refund without calling gateway adapter', async () => {
    const mockRegistry = { get: vi.fn(), has: vi.fn() };
    const mockRepo = { findIntentById: vi.fn() };
    const dispatcher = new PaymentGatewayRefundDispatcher(mockRegistry as never, mockRepo as never);

    const res = await dispatcher.execute({
      paymentIntentId: 'intent-manual',
      refundId: 'ref-manual-1',
      provider: 'COD',
      paymentMethod: 'COD',
      method: 'MANUAL',
      amountMinor: 50000,
      currencyCode: 'BDT',
      idempotencyKey: 'idem-1',
    });

    expect(res.ok).toBe(true);
    expect(res.responseCode).toBe('MANUAL_OK');
    expect(res.providerRefundId).toBe('manual:ref-manual-1');
    expect(mockRegistry.get).not.toHaveBeenCalled();
  });

  it('dispatches ORIGINAL_PROVIDER refund to gateway adapter', async () => {
    const intent = makeCapturedIntent('BKASH');
    const mockAdapter = {
      provider: 'BKASH' as const,
      initializeSession: vi.fn(),
      verifyPayment: vi.fn(),
      refund: vi.fn(async () => ({
        success: true,
        providerRefundId: 'REF_TRX_BKASH_999',
        providerResponseCode: 'Completed',
        rawResponse: {},
      })),
    };

    const mockRegistry = {
      get: vi.fn((method) => (method === 'BKASH' ? (mockAdapter as never) : undefined)),
    };
    const mockRepo = {
      findIntentById: vi.fn(async () => intent),
    };

    const dispatcher = new PaymentGatewayRefundDispatcher(mockRegistry as never, mockRepo as never);

    const res = await dispatcher.execute({
      paymentIntentId: intent.id.value,
      refundId: 'ref-bkash-1',
      provider: 'BKASH',
      paymentMethod: 'BKASH',
      method: 'ORIGINAL_PROVIDER',
      amountMinor: 30000,
      currencyCode: 'BDT',
      idempotencyKey: 'idem-2',
    });

    expect(res.ok).toBe(true);
    expect(res.providerRefundId).toBe('REF_TRX_BKASH_999');
    expect(res.responseCode).toBe('Completed');
    expect(mockAdapter.refund).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntent: intent,
        amountMinor: 30000,
      }),
    );
  });

  it('returns PROVIDER_NOT_CONFIGURED when gateway adapter is missing', async () => {
    const mockRegistry = { get: vi.fn(() => undefined) };
    const mockRepo = { findIntentById: vi.fn() };
    const dispatcher = new PaymentGatewayRefundDispatcher(mockRegistry as never, mockRepo as never);

    const res = await dispatcher.execute({
      paymentIntentId: 'intent-missing-adapter',
      refundId: 'ref-1',
      provider: 'NAGAD',
      paymentMethod: 'NAGAD',
      method: 'ORIGINAL_PROVIDER',
      amountMinor: 10000,
      currencyCode: 'BDT',
      idempotencyKey: 'idem-3',
    });

    expect(res.ok).toBe(false);
    expect(res.responseCode).toBe('PROVIDER_NOT_CONFIGURED');
  });
});
