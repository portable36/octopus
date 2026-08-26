import { apiRequest } from '@/lib/api-client';

export type StorefrontPublicConfig = {
  scope:
    | { kind: 'platform' }
    | { kind: 'vendor'; vendorId: string }
    | { kind: 'store'; vendorId: string; storeId: string };
  general: {
    schemaVersion: 1;
    supportEmail: string | null;
    defaultLocale: string;
    defaultCurrencyCode: string;
  };
  branding: {
    schemaVersion: 1;
    siteName: string | null;
    tagline: string | null;
    primaryColor: string | null;
    logoMediaId: string | null;
    faviconMediaId: string | null;
  };
  marketing: {
    gtmContainerId: string | null;
    ga4MeasurementId: string | null;
    metaPixelId: string | null;
    enabled: boolean;
  };
};

export type FetchStorefrontConfigOptions = {
  vendorId?: string;
  storeId?: string;
};

export function fetchStorefrontConfig(
  options: FetchStorefrontConfigOptions = {},
): Promise<StorefrontPublicConfig> {
  const params = new URLSearchParams();
  if (options.vendorId) {
    params.set('vendorId', options.vendorId);
  }
  if (options.storeId) {
    params.set('storeId', options.storeId);
  }
  const qs = params.toString();
  return apiRequest<StorefrontPublicConfig>(`/storefront/config${qs ? `?${qs}` : ''}`);
}
