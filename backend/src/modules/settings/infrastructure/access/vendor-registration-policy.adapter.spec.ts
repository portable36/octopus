import { describe, expect, it, vi } from 'vitest';
import { VendorRegistrationPolicyAdapter } from './vendor-registration-policy.adapter';

describe('VendorRegistrationPolicyAdapter', () => {
  it('defaults vendor registration to disabled', async () => {
    const configs = {
      findForResolution: vi.fn().mockResolvedValue([]),
    };
    const policy = new VendorRegistrationPolicyAdapter(configs as never);

    await expect(policy.isEnabled()).resolves.toBe(false);
  });

  it('reads the platform vendor registration setting', async () => {
    const configs = {
      findForResolution: vi.fn().mockResolvedValue([
        {
          key: 'general',
          scopeKind: 'platform',
          vendorId: null,
          storeId: null,
          payload: { vendorRegistrationEnabled: true },
        },
      ]),
    };
    const policy = new VendorRegistrationPolicyAdapter(configs as never);

    await expect(policy.isEnabled()).resolves.toBe(true);
  });
});
