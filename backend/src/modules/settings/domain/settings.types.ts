export type ConfigurationScopeKind = 'platform' | 'vendor' | 'store';

export type ConfigurationScope =
  | { readonly kind: 'platform' }
  | { readonly kind: 'vendor'; readonly vendorId: string }
  | { readonly kind: 'store'; readonly vendorId: string; readonly storeId: string };

export type ConfigurationKey = 'general' | 'branding';

export type GeneralSettings = {
  readonly schemaVersion: 1;
  readonly supportEmail: string | null;
  readonly defaultLocale: string;
  readonly defaultCurrencyCode: string;
};

export type BrandingSettings = {
  readonly schemaVersion: 1;
  readonly primaryColor: string | null;
  readonly logoMediaId: string | null;
};

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  schemaVersion: 1,
  supportEmail: null,
  defaultLocale: 'en',
  defaultCurrencyCode: 'BDT',
};

export const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  schemaVersion: 1,
  primaryColor: null,
  logoMediaId: null,
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
