import {
  toPublicMarketingConfig,
  type PublicMarketingConfig,
} from '../../../../shared-kernel/application/ports/marketing-settings.port';
import type {
  BrandingSettings,
  ConfigurationScope,
  GeneralSettings,
  MarketingSettings,
} from '../../domain/settings.types';

export type StorefrontPublicConfig = {
  readonly scope: ConfigurationScope;
  readonly general: GeneralSettings;
  readonly branding: BrandingSettings;
  readonly marketing: PublicMarketingConfig;
};

/** Public storefront/config body — marketing secrets are stripped here. */
export function toStorefrontPublicConfig(input: {
  readonly scope: ConfigurationScope;
  readonly general: GeneralSettings;
  readonly branding: BrandingSettings;
  readonly marketing: MarketingSettings;
}): StorefrontPublicConfig {
  return {
    scope: input.scope,
    general: input.general,
    branding: input.branding,
    marketing: toPublicMarketingConfig(input.marketing),
  };
}
