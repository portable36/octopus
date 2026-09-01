import { describe, expect, it } from 'vitest';
import {
  resolveEffectiveBranding,
  resolveEffectiveGeneral,
  resolveEffectiveMarketing,
} from './resolve-effective';
import type { ConfigurationDocumentRecord } from '../settings.types';

function doc(
  partial: Omit<ConfigurationDocumentRecord, 'id' | 'updatedAt' | 'updatedBy' | 'schemaVersion'> & {
    id?: string;
  },
): ConfigurationDocumentRecord {
  return {
    id: partial.id ?? '00000000-0000-7000-8000-000000000001',
    key: partial.key,
    scopeKind: partial.scopeKind,
    vendorId: partial.vendorId,
    storeId: partial.storeId,
    schemaVersion: 1,
    payload: partial.payload,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedBy: null,
  };
}

describe('resolveEffective', () => {
  it('returns platform defaults when no documents exist', () => {
    expect(resolveEffectiveGeneral([], { kind: 'platform' })).toEqual({
      schemaVersion: 1,
      supportEmail: null,
      defaultLocale: 'en',
      defaultCurrencyCode: 'BDT',
      vendorRegistrationEnabled: false,
    });
    expect(resolveEffectiveBranding([], { kind: 'platform' })).toEqual({
      schemaVersion: 1,
      siteName: null,
      tagline: null,
      primaryColor: null,
      logoMediaId: null,
      faviconMediaId: null,
    });
  });

  it('uses platform document only for platform target', () => {
    const documents = [
      doc({
        key: 'general',
        scopeKind: 'platform',
        vendorId: null,
        storeId: null,
        payload: { supportEmail: 'ops@octopus.test', defaultLocale: 'bn' },
      }),
    ];

    expect(resolveEffectiveGeneral(documents, { kind: 'platform' }).supportEmail).toBe(
      'ops@octopus.test',
    );
    expect(resolveEffectiveGeneral(documents, { kind: 'platform' }).defaultLocale).toBe('bn');
  });

  it('applies vendor override over platform', () => {
    const vendorId = '11111111-1111-7111-8111-111111111111';
    const documents = [
      doc({
        key: 'general',
        scopeKind: 'platform',
        vendorId: null,
        storeId: null,
        payload: { supportEmail: 'ops@octopus.test', defaultCurrencyCode: 'USD' },
      }),
      doc({
        id: '00000000-0000-7000-8000-000000000002',
        key: 'general',
        scopeKind: 'vendor',
        vendorId,
        storeId: null,
        payload: { supportEmail: 'vendor@example.com' },
      }),
    ];

    const effective = resolveEffectiveGeneral(documents, { kind: 'vendor', vendorId });
    expect(effective.supportEmail).toBe('vendor@example.com');
    expect(effective.defaultCurrencyCode).toBe('USD');
  });

  it('applies store override over vendor and platform', () => {
    const vendorId = '11111111-1111-7111-8111-111111111111';
    const storeId = '22222222-2222-7222-8222-222222222222';
    const documents = [
      doc({
        key: 'branding',
        scopeKind: 'platform',
        vendorId: null,
        storeId: null,
        payload: { primaryColor: '#111111' },
      }),
      doc({
        id: '00000000-0000-7000-8000-000000000002',
        key: 'branding',
        scopeKind: 'vendor',
        vendorId,
        storeId: null,
        payload: { primaryColor: '#222222', logoMediaId: 'media-vendor' },
      }),
      doc({
        id: '00000000-0000-7000-8000-000000000003',
        key: 'branding',
        scopeKind: 'store',
        vendorId,
        storeId,
        payload: { primaryColor: '#333333' },
      }),
    ];

    const effective = resolveEffectiveBranding(documents, {
      kind: 'store',
      vendorId,
      storeId,
    });
    expect(effective.primaryColor).toBe('#333333');
    expect(effective.logoMediaId).toBe('media-vendor');
  });

  it('resolves marketing defaults and platform overrides', () => {
    expect(resolveEffectiveMarketing([], { kind: 'platform' }).enabled).toBe(false);
    const documents = [
      doc({
        key: 'marketing',
        scopeKind: 'platform',
        vendorId: null,
        storeId: null,
        payload: {
          enabled: true,
          gtmContainerId: 'GTM-1',
          ga4MpApiSecret: 'secret',
        },
      }),
    ];
    const effective = resolveEffectiveMarketing(documents, { kind: 'platform' });
    expect(effective.enabled).toBe(true);
    expect(effective.gtmContainerId).toBe('GTM-1');
    expect(effective.ga4MpApiSecret).toBe('secret');
  });
});
