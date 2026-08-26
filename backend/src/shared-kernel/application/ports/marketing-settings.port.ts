export const MARKETING_SETTINGS_PORT = Symbol('MARKETING_SETTINGS_PORT');

/** Full platform marketing config including server-only secrets. */
export type MarketingRuntimeSettings = {
  readonly schemaVersion: 1;
  readonly gtmContainerId: string | null;
  readonly ga4MeasurementId: string | null;
  readonly ga4MpApiSecret: string | null;
  readonly metaPixelId: string | null;
  readonly metaCapiToken: string | null;
  readonly enabled: boolean;
};

/** Browser-safe subset — never includes secrets. */
export type PublicMarketingConfig = {
  readonly gtmContainerId: string | null;
  readonly ga4MeasurementId: string | null;
  readonly metaPixelId: string | null;
  readonly enabled: boolean;
};

export interface MarketingSettingsPort {
  getRuntime(): Promise<MarketingRuntimeSettings>;
  getPublic(): Promise<PublicMarketingConfig>;
}

export function toPublicMarketingConfig(settings: MarketingRuntimeSettings): PublicMarketingConfig {
  return {
    gtmContainerId: settings.gtmContainerId,
    ga4MeasurementId: settings.ga4MeasurementId,
    metaPixelId: settings.metaPixelId,
    enabled: settings.enabled,
  };
}
