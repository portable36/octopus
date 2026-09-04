import { describe, expect, it, vi } from 'vitest';
import { StoreAccessDeniedError } from '../errors/store.errors';
import { ListAdminStoresHandler } from './list-admin-stores.handler';

describe('ListAdminStoresHandler', () => {
  it('rejects non-platform actors for list and stats', async () => {
    const stores = {
      listAdmin: vi.fn(),
      statsByStatus: vi.fn(),
    };
    const handler = new ListAdminStoresHandler(stores as never);

    await expect(
      handler.list(['VENDOR_OWNER'], {
        page: 1,
        limit: 20,
        sort: 'createdAt_desc',
      }),
    ).rejects.toBeInstanceOf(StoreAccessDeniedError);

    await expect(handler.stats(['CUSTOMER'])).rejects.toBeInstanceOf(StoreAccessDeniedError);
    expect(stores.listAdmin).not.toHaveBeenCalled();
    expect(stores.statsByStatus).not.toHaveBeenCalled();
  });

  it('delegates list and stats for platform admin', async () => {
    const listResult = {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    };
    const statsResult = { total: 3, byStatus: { active: 2, draft: 1 } };
    const stores = {
      listAdmin: vi.fn().mockResolvedValue(listResult),
      statsByStatus: vi.fn().mockResolvedValue(statsResult),
    };
    const handler = new ListAdminStoresHandler(stores as never);

    await expect(
      handler.list(['PLATFORM_ADMIN'], {
        q: 'gulshan',
        statuses: ['active'],
        page: 1,
        limit: 20,
        sort: 'name_asc',
      }),
    ).resolves.toEqual(listResult);

    await expect(handler.stats(['PLATFORM_ADMIN'])).resolves.toEqual(statsResult);
    expect(stores.listAdmin).toHaveBeenCalledOnce();
    expect(stores.statsByStatus).toHaveBeenCalledOnce();
  });
});
