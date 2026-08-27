import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRANDING_SETTINGS,
  DEFAULT_GENERAL_SETTINGS,
  type MarketingSettings,
} from '../../domain/settings.types';
import { toStorefrontPublicConfig } from '../../application/mappers/storefront-public-config';

describe('toStorefrontPublicConfig', () => {
  it('never includes marketing secret keys in the public response', () => {
    const marketing: MarketingSettings = {
      schemaVersion: 1,
      gtmContainerId: 'GTM-1',
      ga4MeasurementId: 'G-1',
      ga4MpApiSecret: 'server-secret',
      metaPixelId: 'pixel',
      metaCapiToken: 'capi-token',
      enabled: true,
    };

    const response = toStorefrontPublicConfig({
      scope: { kind: 'platform' },
      general: DEFAULT_GENERAL_SETTINGS,
      branding: {
        ...DEFAULT_BRANDING_SETTINGS,
        siteName: 'Octopus',
        tagline: 'Shop',
      },
      marketing,
    });

    expect(response.marketing).not.toHaveProperty('ga4MpApiSecret');
    expect(response.marketing).not.toHaveProperty('metaCapiToken');
    expect(JSON.stringify(response)).not.toContain('server-secret');
    expect(JSON.stringify(response)).not.toContain('capi-token');
    expect(response.branding.siteName).toBe('Octopus');
    expect(response.branding).toHaveProperty('faviconMediaId');
  });
});
