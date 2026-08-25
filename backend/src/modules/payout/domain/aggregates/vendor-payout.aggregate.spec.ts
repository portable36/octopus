import { describe, expect, it } from 'vitest';
import { InvalidPayoutTransitionError } from '../errors/payout.errors';
import { VendorPayout } from './vendor-payout.aggregate';

function createPayout() {
  return VendorPayout.create({
    vendorId: 'v1',
    storeId: 's1',
    amountMinor: 500,
    currencyCode: 'bdt',
    idempotencyKey: 'idem-payout-1',
    requestedByUserId: 'u1',
  });
}

describe('VendorPayout', () => {
  it('creates under review and completes happy path', () => {
    const payout = createPayout();
    expect(payout.status).toBe('UNDER_REVIEW');
    expect(payout.currencyCode).toBe('BDT');

    payout.approve();
    payout.startProcessing();
    payout.complete({ providerRef: 'stub-1', ledgerEntryId: 'le-1' });
    expect(payout.status).toBe('COMPLETED');
    expect(payout.ledgerEntryId).toBe('le-1');
  });

  it('rejects from under review and fails from processing', () => {
    const a = createPayout();
    a.reject('docs incomplete');
    expect(a.status).toBe('REJECTED');

    const b = createPayout();
    b.approve();
    b.startProcessing();
    b.fail('provider timeout');
    expect(b.status).toBe('FAILED');
  });

  it('blocks illegal transitions', () => {
    const payout = createPayout();
    payout.approve();
    expect(() => payout.reject('nope')).toThrow(InvalidPayoutTransitionError);
  });
});
