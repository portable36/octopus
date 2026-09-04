import { describe, expect, it, vi } from 'vitest';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Store } from '../../domain/aggregates/store.aggregate';
import { StoreAccessDeniedError, StoreNotFoundError } from '../errors/store.errors';
import { GetStoreOverviewHandler } from './get-store-overview.handler';

function makeActiveStore(): Store {
  return Store.create({
    vendorId: UniqueID.create().value,
    managerUserId: UniqueID.create().value,
    displayName: 'Test Store',
    countryCode: 'BD',
  });
}

describe('GetStoreOverviewHandler', () => {
  it('denies non-platform actors (IDOR gate)', async () => {
    const handler = new GetStoreOverviewHandler(
      { findById: vi.fn() } as never,
      { findLatestRunByStoreId: vi.fn() } as never,
      { evaluate: vi.fn() } as never,
    );
    await expect(handler.execute(UniqueID.create().value, ['VENDOR_OWNER'])).rejects.toBeInstanceOf(
      StoreAccessDeniedError,
    );
    await expect(
      handler.healthOnly(UniqueID.create().value, ['STORE_MANAGER']),
    ).rejects.toBeInstanceOf(StoreAccessDeniedError);
  });

  it('throws when store missing', async () => {
    const handler = new GetStoreOverviewHandler(
      { findById: vi.fn().mockResolvedValue(null) } as never,
      { findLatestRunByStoreId: vi.fn() } as never,
      { evaluate: vi.fn() } as never,
    );
    await expect(
      handler.execute(UniqueID.create().value, ['PLATFORM_ADMIN']),
    ).rejects.toBeInstanceOf(StoreNotFoundError);
  });

  it('returns health and unavailable metrics for active store', async () => {
    const store = makeActiveStore();
    const health = {
      storeId: store.id.value,
      score: 'WARNING' as const,
      checks: [
        {
          key: 'warehouse_exists',
          label: 'Default warehouse',
          ok: false,
          severity: 'WARNING' as const,
          detail: 'missing',
        },
      ],
    };
    const evaluate = vi.fn().mockResolvedValue(health);
    const findLatestRunByStoreId = vi.fn();
    const handler = new GetStoreOverviewHandler(
      { findById: vi.fn().mockResolvedValue(store) } as never,
      { findLatestRunByStoreId } as never,
      { evaluate } as never,
    );

    const result = await handler.execute(store.id.value, ['PLATFORM_ADMIN']);
    expect(result.store).toBe(store);
    expect(result.health.score).toBe('WARNING');
    expect(result.provisioning).toBeNull();
    expect(result.metrics.orders.available).toBe(false);
    expect(result.metrics.revenue.available).toBe(false);
    expect(findLatestRunByStoreId).not.toHaveBeenCalled();
    expect(evaluate).toHaveBeenCalledWith(store.id.value, store.status);
  });
});
