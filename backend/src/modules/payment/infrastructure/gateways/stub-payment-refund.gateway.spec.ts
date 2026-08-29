import { describe, expect, it } from 'vitest';
import { StubPaymentRefundGateway } from './stub-payment-refund.gateway';

describe('StubPaymentRefundGateway', () => {
  it('rejects provider refunds instead of reporting a false success', async () => {
    const result = await new StubPaymentRefundGateway().execute({
      paymentIntentId: 'payment-1',
      refundId: 'refund-1',
      provider: 'BKASH',
      paymentMethod: 'BKASH',
      method: 'ORIGINAL_PROVIDER',
      amountMinor: 100,
      currencyCode: 'BDT',
      idempotencyKey: 'refund-idempotency-1',
    });

    expect(result).toMatchObject({
      ok: false,
      providerRefundId: null,
      responseCode: 'PROVIDER_NOT_CONFIGURED',
    });
  });
});
