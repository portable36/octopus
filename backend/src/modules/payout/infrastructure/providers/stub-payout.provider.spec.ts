import { describe, expect, it } from 'vitest';
import { StubPayoutProviderAdapter } from './stub-payout.provider';

describe('StubPayoutProviderAdapter', () => {
  it('rejects disbursement instead of reporting a false success', async () => {
    const result = await new StubPayoutProviderAdapter().disburse({
      payoutId: 'payout-1',
      vendorId: 'vendor-1',
      amountMinor: 100,
      currencyCode: 'BDT',
    });

    expect(result).toEqual({
      ok: false,
      reason: 'PAYOUT_PROVIDER_NOT_CONFIGURED',
    });
  });
});
