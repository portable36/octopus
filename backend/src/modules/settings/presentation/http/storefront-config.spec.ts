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
    expect(response.theme).toBeDefined();
    expect(response.theme.heroBanner.enabled).toBe(true);
    expect(response.theme.announcementBar.text).toBe('Delivery across Bangladesh');
  });

  it('includes custom theme configuration when provided', () => {
    const response = toStorefrontPublicConfig({
      scope: { kind: 'platform' },
      general: DEFAULT_GENERAL_SETTINGS,
      branding: DEFAULT_BRANDING_SETTINGS,
      marketing: {
        schemaVersion: 1,
        gtmContainerId: null,
        ga4MeasurementId: null,
        ga4MpApiSecret: null,
        metaPixelId: null,
        metaCapiToken: null,
        enabled: false,
      },
      theme: {
        ...DEFAULT_BRANDING_SETTINGS,
        schemaVersion: 1,
        announcementBar: {
          enabled: true,
          text: 'Ramadan Special Offer!',
          linkText: 'Shop now',
          linkUrl: '/search?discount=true',
        },
        colors: {
          primary: '#111827',
          accent: '#10b981',
          announcementBg: '#065f46',
          announcementText: '#ecfdf5',
        },
        heroBanner: {
          enabled: true,
          title: 'Special Ramadan Deals',
          subtitle: 'Exclusive discounts on all categories',
          ctaText: 'Browse Ramadan Offers',
          ctaUrl: '/categories',
          badgeText: 'Festive Offers',
          imageUrl: 'https://example.com/banner.jpg',
        },
        promoBanner: {
          enabled: true,
          title: 'Vendor Ramadan Registration',
          text: 'Zero commission for the first month',
          ctaText: 'Join Now',
          ctaUrl: '/vendor',
        },
        header: {
          searchPlaceholder: 'Search Ramadan deals',
          navLinks: [{ label: 'Ramadan Deals', href: '/ramadan' }],
        },
        footer: {
          aboutText: 'Leading marketplace in BD',
          copyrightText: '© 2026 Octopus Corp',
          columns: [{ title: 'Deals', links: [{ label: 'Eid Specials', href: '/eid' }] }],
        },
      },
    });

    expect(response.theme.announcementBar.text).toBe('Ramadan Special Offer!');
    expect(response.theme.colors.accent).toBe('#10b981');
    expect(response.theme.heroBanner.title).toBe('Special Ramadan Deals');
    expect(response.theme.header.searchPlaceholder).toBe('Search Ramadan deals');
    expect(response.theme.footer.copyrightText).toBe('© 2026 Octopus Corp');
  });
});
