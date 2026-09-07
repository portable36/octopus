import {
  toPublicMarketingConfig,
  type PublicMarketingConfig,
} from '../../../../shared-kernel/application/ports/marketing-settings.port';
import {
  DEFAULT_THEME_SETTINGS,
  type BrandingSettings,
  type ConfigurationScope,
  type GeneralSettings,
  type MarketingSettings,
  type ThemeSettings,
} from '../../domain/settings.types';

export type StorefrontPublicConfig = {
  readonly scope: ConfigurationScope;
  readonly general: GeneralSettings;
  readonly branding: BrandingSettings;
  readonly marketing: PublicMarketingConfig;
  readonly theme: ThemeSettings;
};

/** Public storefront/config body — marketing secrets are stripped here. */
export function toStorefrontPublicConfig(input: {
  readonly scope: ConfigurationScope;
  readonly general: GeneralSettings;
  readonly branding: BrandingSettings;
  readonly marketing: MarketingSettings;
  readonly theme?: ThemeSettings;
}): StorefrontPublicConfig {
  return {
    scope: input.scope,
    general: input.general,
    branding: input.branding,
    marketing: toPublicMarketingConfig(input.marketing),
    theme: input.theme ?? DEFAULT_THEME_SETTINGS,
  };
}
