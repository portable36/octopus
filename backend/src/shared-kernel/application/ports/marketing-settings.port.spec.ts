import { describe, expect, it } from 'vitest';
import { toPublicMarketingConfig, type MarketingRuntimeSettings } from './marketing-settings.port';

describe('toPublicMarketingConfig', () => {
  it('exposes only non-secret fields', () => {
    const runtime: MarketingRuntimeSettings = {
      schemaVersion: 1,
      gtmContainerId: 'GTM-X',
      ga4MeasurementId: 'G-X',
      ga4MpApiSecret: 'server-secret',
      metaPixelId: '123',
      metaCapiToken: 'capi-token',
      enabled: true,
    };

    const publicShape = toPublicMarketingConfig(runtime);
    expect(publicShape).toEqual({
      gtmContainerId: 'GTM-X',
      ga4MeasurementId: 'G-X',
      metaPixelId: '123',
      enabled: true,
    });
    expect(Object.keys(publicShape).sort()).toEqual(
      ['enabled', 'ga4MeasurementId', 'gtmContainerId', 'metaPixelId'].sort(),
    );
    expect(publicShape).not.toHaveProperty('ga4MpApiSecret');
    expect(publicShape).not.toHaveProperty('metaCapiToken');
  });
});
