import { describe, expect, it } from 'vitest';
import { buildRefundLedgerAllocation } from './build-refund-ledger-allocation';

describe('buildRefundLedgerAllocation', () => {
  it('embeds REFUND allocation without inventing commission', () => {
    const allocation = buildRefundLedgerAllocation({
      refundId: 'r1',
      paymentIntentId: 'pi1',
      orderId: 'o1',
      vendorId: 'v1',
      storeId: 's1',
      returnId: 'ret1',
      amountMinor: 500,
      currencyCode: 'BDT',
      method: 'MANUAL',
    });
    expect(allocation.entryType).toBe('REFUND');
    expect(allocation.idempotencyKey).toBe('ledger:refund:r1');
    expect(allocation.commissionReversalMinor).toBeNull();
    expect(allocation.amountMinor).toBe(500);
  });
});
