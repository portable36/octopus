import { describe, expect, it, vi } from 'vitest';
import { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import { CodAmountMismatchError } from '../../domain/errors/payment.errors';
import { ProcessGatewayCallbackHandler } from './payment-gateway.handlers';

function makeGatewayIntent(method: 'SSLCOMMERZ' | 'BKASH' | 'NAGAD', amountMinor = 150000) {
  return PaymentIntent.create({
    checkoutId: 'chk-1',
    orderId: 'ord-gw-1',
    vendorId: 'vendor-1',
    storeId: 'store-1',
    customerId: 'cust-1',
    paymentMethod: method,
    amountMinor,
    currencyCode: 'BDT',
  });
}

describe('ProcessGatewayCallbackHandler', () => {
  it('captures bKash payment, calls orders markPaid, and saves intent', async () => {
    const intent = makeGatewayIntent('BKASH', 150000);
    const savedIntents: PaymentIntent[] = [];
    const collections: Record<string, unknown>[] = [];

    const repo = {
      findIntentById: vi.fn(async (id: string) => (id === intent.id.value ? intent : null)),
      findIntentByOrderId: vi.fn(async () => null),
      findIntentByGatewayReference: vi.fn(async (ref: string) =>
        ref === 'PID_123' ? intent : null,
      ),
      saveIntent: vi.fn(async (i: PaymentIntent) => {
        savedIntents.push(i);
      }),
      saveCodCollection: vi.fn(async (rec: unknown) => {
        collections.push(rec as Record<string, unknown>);
        return rec;
      }),
    };

    const mockBkashAdapter = {
      provider: 'BKASH' as const,
      initializeSession: vi.fn(),
      verifyPayment: vi.fn(async () => ({
        isSuccess: true,
        providerTransactionId: 'TRX_BKASH_12345',
        amountMinor: 150000,
        currencyCode: 'BDT',
        gatewayStatusCode: 'Completed',
        rawResponse: { trxID: 'TRX_BKASH_12345', status: 'Completed' },
      })),
      refund: vi.fn(),
    };

    const registry = {
      get: vi.fn(() => mockBkashAdapter as never),
      has: vi.fn(() => true),
    };

    const orders = {
      markPaidFromPayment: vi.fn(async () => {}),
    };

    const audit = {
      append: vi.fn(async () => {}),
    };

    const handler = new ProcessGatewayCallbackHandler(
      repo as never,
      registry as never,
      orders as never,
      audit as never,
      undefined,
    );

    const result = await handler.execute({
      provider: 'BKASH',
      paymentIntentId: intent.id.value,
      payload: { paymentID: 'PID_123', status: 'success' },
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('CAPTURED');
    expect(result.providerTransactionId).toBe('TRX_BKASH_12345');
    expect(intent.status).toBe('CAPTURED');
    expect(orders.markPaidFromPayment).toHaveBeenCalledWith({
      orderId: intent.orderId,
      paymentIntentId: intent.id.value,
      amountMinor: intent.amountMinor,
      currencyCode: intent.currencyCode,
    });
    expect(collections.length).toBe(1);
    expect(collections[0]?.amountMinor).toBe(150000);
    expect(audit.append).toHaveBeenCalled();
  });

  it('handles customer cancellation without marking order paid', async () => {
    const intent = makeGatewayIntent('SSLCOMMERZ', 200000);
    const repo = {
      findIntentById: vi.fn(async () => intent),
      saveIntent: vi.fn(async () => {}),
      saveCodCollection: vi.fn(),
    };

    const mockSslAdapter = {
      provider: 'SSLCOMMERZ' as const,
      initializeSession: vi.fn(),
      verifyPayment: vi.fn(async () => ({
        isSuccess: false,
        isCancelled: true,
        providerTransactionId: '',
        amountMinor: 200000,
        currencyCode: 'BDT',
        gatewayStatusCode: 'CANCEL',
        rawResponse: { status: 'CANCEL' },
      })),
      refund: vi.fn(),
    };

    const registry = { get: vi.fn(() => mockSslAdapter as never) };
    const orders = { markPaidFromPayment: vi.fn() };

    const handler = new ProcessGatewayCallbackHandler(
      repo as never,
      registry as never,
      orders as never,
    );

    const result = await handler.execute({
      provider: 'SSLCOMMERZ',
      paymentIntentId: intent.id.value,
      payload: { status: 'CANCEL', tran_id: intent.id.value },
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('CANCELLED');
    expect(intent.status).toBe('CANCELLED');
    expect(orders.markPaidFromPayment).not.toHaveBeenCalled();
  });

  it('rejects amount mismatch and does not mark order paid', async () => {
    const intent = makeGatewayIntent('NAGAD', 50000);
    const repo = {
      findIntentById: vi.fn(async () => intent),
      saveIntent: vi.fn(async () => {}),
      saveCodCollection: vi.fn(),
    };

    const mockNagadAdapter = {
      provider: 'NAGAD' as const,
      initializeSession: vi.fn(),
      verifyPayment: vi.fn(async () => ({
        isSuccess: true,
        providerTransactionId: 'TRX_NAGAD_MISMATCH',
        amountMinor: 40000, // mismatch: expected 50000
        currencyCode: 'BDT',
        gatewayStatusCode: 'Success',
        rawResponse: {},
      })),
      refund: vi.fn(),
    };

    const registry = { get: vi.fn(() => mockNagadAdapter as never) };
    const orders = { markPaidFromPayment: vi.fn() };

    const handler = new ProcessGatewayCallbackHandler(
      repo as never,
      registry as never,
      orders as never,
    );

    await expect(
      handler.execute({
        provider: 'NAGAD',
        paymentIntentId: intent.id.value,
        payload: { payment_ref_id: 'REF_999' },
      }),
    ).rejects.toBeInstanceOf(CodAmountMismatchError);

    expect(intent.status).toBe('FAILED');
    expect(orders.markPaidFromPayment).not.toHaveBeenCalled();
  });

  it('guards against replay loops via Redis NX lock', async () => {
    const intent = makeGatewayIntent('BKASH', 100000);
    const repo = {
      findIntentById: vi.fn(async () => intent),
      saveIntent: vi.fn(async () => {}),
      saveCodCollection: vi.fn(async () => ({})),
    };

    const mockAdapter = {
      provider: 'BKASH' as const,
      initializeSession: vi.fn(),
      verifyPayment: vi.fn(async () => ({
        isSuccess: true,
        providerTransactionId: 'TRX_DUPLICATE_REPLAY',
        amountMinor: 100000,
        currencyCode: 'BDT',
        gatewayStatusCode: 'Completed',
        rawResponse: {},
      })),
      refund: vi.fn(),
    };

    const registry = { get: vi.fn(() => mockAdapter as never) };
    const orders = { markPaidFromPayment: vi.fn() };

    // Redis mock that rejects second call with null (NX check fails)
    const redis = {
      set: vi.fn().mockResolvedValueOnce('OK').mockResolvedValueOnce(null),
    };

    const handler = new ProcessGatewayCallbackHandler(
      repo as never,
      registry as never,
      orders as never,
      undefined,
      redis as never,
    );

    const first = await handler.execute({
      provider: 'BKASH',
      paymentIntentId: intent.id.value,
      payload: { paymentID: 'PID_FIRST' },
    });
    expect(first.success).toBe(true);
    expect(orders.markPaidFromPayment).toHaveBeenCalledTimes(1);

    const second = await handler.execute({
      provider: 'BKASH',
      paymentIntentId: intent.id.value,
      payload: { paymentID: 'PID_FIRST' },
    });
    expect(second.success).toBe(true);
    expect(second.isDuplicate).toBe(true);
    expect(orders.markPaidFromPayment).toHaveBeenCalledTimes(1);
  });
});
