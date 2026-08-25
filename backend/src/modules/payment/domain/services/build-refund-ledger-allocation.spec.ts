import { describe, expect, it } from 'vitest';
import { buildRefundLedgerAllocation } from './build-refund-ledger-allocation';

describe('buildRefundLedgerAllocation', () => {
  it('embeds REFUND allocation without inventing commission when snapshot missing', () => {
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

  it('embeds proportional commission clawback from order snapshot', () => {
    const allocation = buildRefundLedgerAllocation({
      refundId: 'r2',
      paymentIntentId: 'pi1',
      orderId: 'o1',
      vendorId: 'v1',
      storeId: 's1',
      returnId: null,
      amountMinor: 500,
      currencyCode: 'BDT',
      method: 'GATEWAY',
      orderCommissionMinor: 100,
      orderTotalMinor: 1000,
    });
    expect(allocation.commissionReversalMinor).toBe(50);
  });
});
