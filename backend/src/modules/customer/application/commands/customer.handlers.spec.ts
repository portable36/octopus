import { describe, expect, it, vi } from 'vitest';
import { CustomerHandlers } from './customer.handlers';

describe('CustomerHandlers', () => {
  it('creates profile when missing and adds default address', async () => {
    const repo = {
      getProfile: vi.fn().mockResolvedValue(null),
      upsertProfile: vi.fn(async (_id: string, patch: { displayName?: string }) => ({
        userId: 'u1',
        displayName: patch.displayName ?? 'Customer',
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      listAddresses: vi.fn().mockResolvedValue([]),
      findAddress: vi.fn(),
      saveAddress: vi.fn(async (a: unknown) => a),
      deleteAddress: vi.fn(),
      clearDefaultFlags: vi.fn(),
    };
    const handlers = new CustomerHandlers(repo as never);
    const profile = await handlers.getOrCreateProfile('u1', 'Ada');
    expect(profile.displayName).toBe('Ada');

    const address = await handlers.addAddress('u1', {
      label: 'Home',
      recipientName: 'Ada',
      line1: '1 Road',
      city: 'Dhaka',
      countryCode: 'bd',
      isDefault: true,
    });
    expect(repo.clearDefaultFlags).toHaveBeenCalledWith('u1');
    expect(address.countryCode).toBe('BD');
    expect(address.isDefault).toBe(true);
  });
});
