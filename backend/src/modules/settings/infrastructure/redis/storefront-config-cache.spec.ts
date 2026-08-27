import { describe, expect, it, vi } from 'vitest';
import { StorefrontConfigCache } from './storefront-config-cache';

describe('StorefrontConfigCache', () => {
  it('uses generation in payload keys and bumps gen on invalidate', async () => {
    const store = new Map<string, string>();
    const redis = {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
        return 'OK';
      }),
      incr: vi.fn(async (key: string) => {
        const next = String(Number(store.get(key) ?? '0') + 1);
        store.set(key, next);
        return Number(next);
      }),
      expire: vi.fn(async () => 1),
    };

    const cache = new StorefrontConfigCache(redis as never);
    const scope = { kind: 'platform' as const };
    const payload = {
      scope,
      general: {
        schemaVersion: 1 as const,
        supportEmail: null,
        defaultLocale: 'en',
        defaultCurrencyCode: 'BDT',
      },
      branding: {
        schemaVersion: 1 as const,
        siteName: 'A',
        tagline: null,
        primaryColor: null,
        logoMediaId: null,
        faviconMediaId: null,
      },
      marketing: {
        gtmContainerId: null,
        ga4MeasurementId: null,
        metaPixelId: null,
        enabled: false,
      },
    };

    await cache.set(scope, payload);
    expect(await cache.get(scope)).toEqual(payload);

    await cache.invalidateAll();
    expect(await cache.get(scope)).toBeNull();
    expect(redis.incr).toHaveBeenCalledWith('settings:storefront-config:gen');
  });
});
