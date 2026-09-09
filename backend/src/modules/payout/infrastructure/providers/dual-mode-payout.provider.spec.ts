import { describe, expect, it } from 'vitest';
import { DualModePayoutProviderAdapter } from './dual-mode-payout.provider';

describe('DualModePayoutProviderAdapter', () => {
  it('simulates success outside production when bank keys are absent', async () => {
    const adapter = new DualModePayoutProviderAdapter({ nodeEnv: 'development' } as never);
    const result = await adapter.disburse({
      payoutId: 'payout-1',
      vendorId: 'vendor-1',
      amountMinor: 1500,
      currencyCode: 'BDT',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.providerRef).toContain('sim-');
    }
  });
});
