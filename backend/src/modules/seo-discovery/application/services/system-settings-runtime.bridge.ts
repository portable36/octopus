import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import type { Env } from '../../../../config/env.validation';
import { SYSTEM_SETTING_KEYS, type SystemSettingKey } from '../../domain/system-setting-keys';
import { SystemSettingsService } from './system-settings.service';

export type MetaCapiEnvView = {
  readonly metaPixelId?: string;
  readonly metaAccessToken?: string;
  readonly metaCapiDataSource?: Env['META_CAPI_DATA_SOURCE'];
  readonly metaAndromedaDataProcessingOptionsRaw?: string;
  readonly metaAndromedaCountry?: number;
  readonly metaAndromedaState?: number;
  readonly gemSchemaVersion?: string;
  readonly gemTrackingEnvironment?: Env['GEM_TRACKING_ENVIRONMENT'];
};

@Injectable()
export class SystemSettingsRuntimeBridge {
  constructor(
    private readonly settings: SystemSettingsService,
    private readonly config: AppConfigService,
  ) {}

  public async resolveString(
    key: SystemSettingKey,
    envFallback: string | undefined,
  ): Promise<string | undefined> {
    const value = await this.settings.getSetting<string>(key);
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return envFallback;
  }

  public async resolveNumber(key: SystemSettingKey, envFallback: number): Promise<number> {
    const value = await this.settings.getSetting<number>(key);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    return envFallback;
  }

  public async resolveSitemapItemsPerChunk(): Promise<number> {
    return this.resolveNumber(
      SYSTEM_SETTING_KEYS.SITEMAP_ITEMS_PER_CHUNK,
      this.config.sitemapItemsPerChunk,
    );
  }

  public async resolveCanonicalAppUrl(): Promise<string> {
    return (
      (await this.resolveString(
        SYSTEM_SETTING_KEYS.SEO_CANONICAL_APP_URL,
        this.config.seoPublicSiteUrl,
      )) ?? this.config.seoPublicSiteUrl
    );
  }

  public async resolveMetaCapiEnv(): Promise<MetaCapiEnvView> {
    const [
      metaPixelId,
      metaAccessToken,
      metaCapiDataSource,
      optionsRaw,
      country,
      state,
      gemVersion,
      gemEnv,
    ] = await Promise.all([
      this.resolveString(SYSTEM_SETTING_KEYS.META_PIXEL_ID, this.config.metaPixelId),
      this.resolveString(SYSTEM_SETTING_KEYS.META_ACCESS_TOKEN, this.config.metaAccessToken),
      this.settings.getSetting<Env['META_CAPI_DATA_SOURCE']>(
        SYSTEM_SETTING_KEYS.META_CAPI_DATA_SOURCE,
      ),
      this.resolveString(
        SYSTEM_SETTING_KEYS.META_ANDROMEDA_DATA_PROCESSING_OPTIONS,
        this.config.metaAndromedaDataProcessingOptionsRaw,
      ),
      this.resolveNumber(
        SYSTEM_SETTING_KEYS.META_ANDROMEDA_COUNTRY,
        this.config.metaAndromedaCountry ?? 0,
      ),
      this.resolveNumber(
        SYSTEM_SETTING_KEYS.META_ANDROMEDA_STATE,
        this.config.metaAndromedaState ?? 0,
      ),
      this.resolveString(SYSTEM_SETTING_KEYS.GEM_SCHEMA_VERSION, this.config.gemSchemaVersion),
      this.settings.getSetting<Env['GEM_TRACKING_ENVIRONMENT']>(
        SYSTEM_SETTING_KEYS.GEM_TRACKING_ENVIRONMENT,
      ),
    ]);

    const env: {
      metaPixelId?: string;
      metaAccessToken?: string;
      metaCapiDataSource?: Env['META_CAPI_DATA_SOURCE'];
      metaAndromedaDataProcessingOptionsRaw?: string;
      metaAndromedaCountry?: number;
      metaAndromedaState?: number;
      gemSchemaVersion?: string;
      gemTrackingEnvironment?: Env['GEM_TRACKING_ENVIRONMENT'];
    } = {};
    if (metaPixelId) {
      env.metaPixelId = metaPixelId;
    }
    if (metaAccessToken) {
      env.metaAccessToken = metaAccessToken;
    }
    if (metaCapiDataSource ?? this.config.metaCapiDataSource) {
      env.metaCapiDataSource = metaCapiDataSource ?? this.config.metaCapiDataSource;
    }
    if (optionsRaw) {
      env.metaAndromedaDataProcessingOptionsRaw = optionsRaw;
    }
    env.metaAndromedaCountry = country;
    env.metaAndromedaState = state;
    if (gemVersion) {
      env.gemSchemaVersion = gemVersion;
    }
    if (gemEnv ?? this.config.gemTrackingEnvironment) {
      env.gemTrackingEnvironment = gemEnv ?? this.config.gemTrackingEnvironment;
    }
    return env;
  }

  public async resolveGoogleSearchConsoleCredentials(): Promise<{
    readonly clientEmail?: string;
    readonly privateKey?: string;
  }> {
    const [clientEmail, privateKey] = await Promise.all([
      this.resolveString(
        SYSTEM_SETTING_KEYS.GOOGLE_SERVICES_CLIENT_EMAIL,
        this.config.googleServicesClientEmail,
      ),
      this.resolveString(
        SYSTEM_SETTING_KEYS.GOOGLE_SERVICES_PRIVATE_KEY,
        this.config.googleServicesPrivateKey,
      ),
    ]);
    const credentials: { clientEmail?: string; privateKey?: string } = {};
    if (clientEmail) {
      credentials.clientEmail = clientEmail;
    }
    if (privateKey) {
      credentials.privateKey = privateKey;
    }
    return credentials;
  }
}
