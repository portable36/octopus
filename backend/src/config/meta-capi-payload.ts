import type { AppConfigService } from './app-config.service';
import {
  applyMetaAndromedaPrivacyFields,
  buildMetaAndromedaPrivacyConfig,
  resolveMetaCapiActionSource,
} from './meta-gem-env';

export function applyMetaCapiEnvToEvent(
  event: Record<string, unknown>,
  config: AppConfigService,
): void {
  const dataSource = config.metaCapiDataSource;
  if (dataSource) {
    event.action_source = resolveMetaCapiActionSource(dataSource);
  }

  const optionsRaw = config.metaAndromedaDataProcessingOptionsRaw;
  const country = config.metaAndromedaCountry;
  const state = config.metaAndromedaState;
  if (optionsRaw !== undefined && country !== undefined && state !== undefined) {
    applyMetaAndromedaPrivacyFields(
      event,
      buildMetaAndromedaPrivacyConfig({ optionsRaw, country, state }),
    );
  }

  const gemVersion = config.gemSchemaVersion;
  const gemEnvironment = config.gemTrackingEnvironment;
  if (gemVersion || gemEnvironment) {
    const customData =
      event.custom_data && typeof event.custom_data === 'object'
        ? (event.custom_data as Record<string, unknown>)
        : {};
    if (gemVersion) {
      customData.gem_schema_version = gemVersion;
    }
    if (gemEnvironment) {
      customData.gem_tracking_environment = gemEnvironment;
    }
    event.custom_data = customData;
  }
}
