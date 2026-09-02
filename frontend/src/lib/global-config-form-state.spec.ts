import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MARKETING_SYSTEM_SETTINGS,
  updateMarketingSystemField,
  updateSeoSystemField,
} from '@/lib/global-config-form-state';

describe('global configuration form state', () => {
  it('updates SEO tab fields when a user edits a parameter string', () => {
    const next = updateSeoSystemField(
      {
        SEO_SITEMAP_CRON: '0 2 * * *',
        SITEMAP_ITEMS_PER_CHUNK: '5000',
        SEO_CANONICAL_APP_URL: 'https://old.example.com',
        GOOGLE_SERVICES_CLIENT_EMAIL: '',
        GOOGLE_SERVICES_PRIVATE_KEY: '',
      },
      'SEO_CANONICAL_APP_URL',
      'https://shop.example.com',
    );

    expect(next.SEO_CANONICAL_APP_URL).toBe('https://shop.example.com');
    expect(next.SEO_SITEMAP_CRON).toBe('0 2 * * *');
  });

  it('updates marketing tab fields without mutating unrelated keys', () => {
    const next = updateMarketingSystemField(
      DEFAULT_MARKETING_SYSTEM_SETTINGS,
      'META_PIXEL_ID',
      'pixel-12345',
    );

    expect(next.META_PIXEL_ID).toBe('pixel-12345');
    expect(next.MARKETING_GTM_CONTAINER_ID).toBe('');
    expect(next.GEM_SCHEMA_VERSION).toBe('2.4.0');
  });
});
