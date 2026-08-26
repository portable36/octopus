export type ConfigurationScopeKind = 'platform' | 'vendor' | 'store';

export type ConfigurationScope =
  | { readonly kind: 'platform' }
  | { readonly kind: 'vendor'; readonly vendorId: string }
  | { readonly kind: 'store'; readonly vendorId: string; readonly storeId: string };

export type ConfigurationKey = 'general' | 'branding' | 'marketing';

export type GeneralSettings = {
  readonly schemaVersion: 1;
  readonly supportEmail: string | null;
  readonly defaultLocale: string;
  readonly defaultCurrencyCode: string;
};

export type BrandingSettings = {
  readonly schemaVersion: 1;
  readonly siteName: string | null;
  readonly tagline: string | null;
  readonly primaryColor: string | null;
  readonly logoMediaId: string | null;
  readonly faviconMediaId: string | null;
};

export type MarketingSettings = {
  readonly schemaVersion: 1;
  readonly gtmContainerId: string | null;
  readonly ga4MeasurementId: string | null;
  /** Server-only — never expose via public config. */
  readonly ga4MpApiSecret: string | null;
  readonly metaPixelId: string | null;
  /** Server-only — never expose via public config. */
  readonly metaCapiToken: string | null;
  readonly enabled: boolean;
};

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  schemaVersion: 1,
  supportEmail: null,
  defaultLocale: 'en',
  defaultCurrencyCode: 'BDT',
};

export const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  schemaVersion: 1,
  siteName: null,
  tagline: null,
  primaryColor: null,
  logoMediaId: null,
  faviconMediaId: null,
};

export const DEFAULT_MARKETING_SETTINGS: MarketingSettings = {
  schemaVersion: 1,
  gtmContainerId: null,
  ga4MeasurementId: null,
  ga4MpApiSecret: null,
  metaPixelId: null,
  metaCapiToken: null,
  enabled: false,
};

export type ConfigurationDocumentRecord = {
  readonly id: string;
  readonly key: ConfigurationKey;
  readonly scopeKind: ConfigurationScopeKind;
  readonly vendorId: string | null;
  readonly storeId: string | null;
  readonly schemaVersion: number;
  readonly payload: Record<string, unknown>;
  readonly updatedAt: Date;
  readonly updatedBy: string | null;
};
