import { describe, expect, it, vi } from 'vitest';
import { StubLedgerAdapter } from './stub-ledger.adapter';

describe('StubLedgerAdapter', () => {
  it('is idempotent on refund allocation keys', async () => {
    const redis = {
      set: vi.fn().mockResolvedValueOnce('OK').mockResolvedValueOnce(null),
    };
    const stub = new StubLedgerAdapter(redis as never);
    const input = {
      entryType: 'REFUND' as const,
      refundId: 'r1',
      paymentIntentId: 'pi',
      orderId: 'o',
      vendorId: 'v',
      storeId: 's',
      returnId: null,
      amountMinor: 100,
      currencyCode: 'BDT',
      method: 'MANUAL',
      referenceType: 'REFUND' as const,
      referenceId: 'r1',
      idempotencyKey: 'ledger:refund:r1',
      commissionReversalMinor: null,
    };

    await stub.recordRefundAllocation(input);
    await stub.recordRefundAllocation(input);

    expect(redis.set).toHaveBeenCalledTimes(2);
    expect(redis.set).toHaveBeenCalledWith(
      'ledger:refund:r1',
      expect.any(String),
      'EX',
      60 * 60 * 24 * 365,
      'NX',
    );
  });
});
