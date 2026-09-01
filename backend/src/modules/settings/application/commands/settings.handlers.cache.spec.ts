import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_BRANDING_SETTINGS, DEFAULT_GENERAL_SETTINGS } from '../../domain/settings.types';
import { SettingsHandlers } from './settings.handlers';

describe('SettingsHandlers storefront cache', () => {
  it('reads through Redis on miss and serves cache on hit', async () => {
    const configs = {
      findForResolution: vi.fn(async () => []),
      findByScopeKey: vi.fn(),
      save: vi.fn(),
    };
    const cache = {
      get: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          scope: { kind: 'platform' },
          general: DEFAULT_GENERAL_SETTINGS,
          branding: { ...DEFAULT_BRANDING_SETTINGS, siteName: 'Cached' },
          marketing: {
            gtmContainerId: null,
            ga4MeasurementId: null,
            metaPixelId: null,
            enabled: false,
          },
        }),
      set: vi.fn(async () => undefined),
      invalidateAll: vi.fn(async () => undefined),
    };

    const handlers = new SettingsHandlers(
      configs as never,
      { assertCanRead: vi.fn(), assertCanWrite: vi.fn() } as never,
      cache as never,
    );

    const miss = await handlers.getStorefrontPublicConfig({ kind: 'platform' });
    expect(miss.branding.siteName).toBeNull();
    expect(configs.findForResolution).toHaveBeenCalledTimes(3);
    expect(cache.set).toHaveBeenCalledTimes(1);

    const hit = await handlers.getStorefrontPublicConfig({ kind: 'platform' });
    expect(hit.branding.siteName).toBe('Cached');
    expect(configs.findForResolution).toHaveBeenCalledTimes(3);
  });

  it('invalidates storefront cache after upsert', async () => {
    const configs = {
      findForResolution: vi.fn(),
      findByScopeKey: vi.fn(async () => null),
      save: vi.fn(async (doc: { id: string }) => doc),
    };
    const cache = {
      get: vi.fn(),
      set: vi.fn(),
      invalidateAll: vi.fn(async () => undefined),
    };
    const handlers = new SettingsHandlers(
      configs as never,
      { assertCanRead: vi.fn(), assertCanWrite: vi.fn() } as never,
      cache as never,
    );

    await handlers.upsert({
      key: 'branding',
      scope: { kind: 'platform' },
      payload: { siteName: 'New' },
      actorUserId: 'user-1',
      actorRoles: ['PLATFORM_ADMIN'],
      actorVendorId: null,
      actorStoreIds: [],
    });

    expect(cache.invalidateAll).toHaveBeenCalledTimes(1);
  });

  it('merges partial updates so unrelated general settings are preserved', async () => {
    const configs = {
      findForResolution: vi.fn(),
      findByScopeKey: vi.fn(async () => ({
        id: 'config-1',
        key: 'general',
        scopeKind: 'platform',
        vendorId: null,
        storeId: null,
        schemaVersion: 1,
        payload: { vendorRegistrationEnabled: true },
        updatedAt: new Date(),
        updatedBy: 'user-1',
      })),
      save: vi.fn(async (doc: unknown) => doc),
    };
    const cache = {
      get: vi.fn(),
      set: vi.fn(),
      invalidateAll: vi.fn(async () => undefined),
    };
    const handlers = new SettingsHandlers(
      configs as never,
      { assertCanRead: vi.fn(), assertCanWrite: vi.fn() } as never,
      cache as never,
    );

    await handlers.upsert({
      key: 'general',
      scope: { kind: 'platform' },
      payload: { defaultLocale: 'bn' },
      actorUserId: 'user-1',
      actorRoles: ['PLATFORM_ADMIN'],
      actorVendorId: null,
      actorStoreIds: [],
    });

    expect(configs.save).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          vendorRegistrationEnabled: true,
          defaultLocale: 'bn',
          schemaVersion: 1,
        },
      }),
    );
  });
});
