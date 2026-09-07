import { describe, expect, it, vi } from 'vitest';
import { AuditAccessDeniedError } from '../errors/audit.errors';
import { AuditHandlers } from './audit.handlers';

describe('AuditHandlers.listRecent', () => {
  it('rejects non-platform actors', async () => {
    const audits = { listRecent: vi.fn(), append: vi.fn() };
    const handler = new AuditHandlers(audits as never);
    await expect(handler.listRecent(['CUSTOMER'], 10, 'auth.')).rejects.toBeInstanceOf(
      AuditAccessDeniedError,
    );
    expect(audits.listRecent).not.toHaveBeenCalled();
  });

  it('forwards actionPrefix for platform admin', async () => {
    const rows = [{ id: '1' }];
    const audits = { listRecent: vi.fn().mockResolvedValue(rows), append: vi.fn() };
    const handler = new AuditHandlers(audits as never);
    const result = await handler.listRecent(['PLATFORM_ADMIN'], 25, 'auth.login');
    expect(audits.listRecent).toHaveBeenCalledWith(25, 'auth.login');
    expect(result).toBe(rows);
  });

  it('queries admin audit log with filters for platform admin', async () => {
    const queryResult = { items: [{ id: '1' }], total: 1 };
    const audits = {
      listRecent: vi.fn(),
      append: vi.fn(),
      query: vi.fn().mockResolvedValue(queryResult),
    };
    const handler = new AuditHandlers(audits as never);
    const result = await handler.queryAdmin(['PLATFORM_ADMIN'], { actionPrefix: 'store.' });
    expect(audits.query).toHaveBeenCalledWith({ actionPrefix: 'store.' });
    expect(result).toBe(queryResult);
  });

  it('rejects admin audit query for non-platform admin', async () => {
    const audits = { listRecent: vi.fn(), append: vi.fn(), query: vi.fn() };
    const handler = new AuditHandlers(audits as never);
    await expect(handler.queryAdmin(['STORE_MANAGER'], {})).rejects.toBeInstanceOf(
      AuditAccessDeniedError,
    );
  });

  it('authorizes store manager to query store activity', async () => {
    const queryResult = { items: [{ id: '1', storeId: 'store-1' }], total: 1 };
    const audits = {
      listRecent: vi.fn(),
      append: vi.fn(),
      query: vi.fn().mockResolvedValue(queryResult),
    };
    const stores = {
      findById: vi.fn().mockResolvedValue({
        storeId: 'store-1',
        vendorId: 'vendor-1',
        managerUserIds: ['user-manager'],
        staffUserIds: [],
      }),
    };
    const handler = new AuditHandlers(audits as never, stores as never);
    const result = await handler.queryStoreActivity('store-1', 'user-manager', ['STORE_MANAGER'], {
      limit: 10,
    });
    expect(audits.query).toHaveBeenCalledWith({ limit: 10, storeId: 'store-1' });
    expect(result).toBe(queryResult);
  });

  it('authorizes vendor owner to query vendor activity', async () => {
    const queryResult = { items: [{ id: '2', vendorId: 'vendor-1' }], total: 1 };
    const audits = {
      listRecent: vi.fn(),
      append: vi.fn(),
      query: vi.fn().mockResolvedValue(queryResult),
    };
    const vendors = {
      findById: vi.fn().mockResolvedValue({
        vendorId: 'vendor-1',
        ownerUserId: 'vendor-owner',
        staffUserIds: [],
      }),
    };
    const handler = new AuditHandlers(audits as never, undefined, vendors as never);
    const result = await handler.queryVendorActivity('vendor-1', 'vendor-owner', ['VENDOR_OWNER'], {
      limit: 20,
    });
    expect(audits.query).toHaveBeenCalledWith({ limit: 20, vendorId: 'vendor-1' });
    expect(result).toBe(queryResult);
  });
});
