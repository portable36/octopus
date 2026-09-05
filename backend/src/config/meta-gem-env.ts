import { z } from 'zod';

export const META_CAPI_DATA_SOURCES = ['system_generated', 'server'] as const;
export type MetaCapiDataSource = (typeof META_CAPI_DATA_SOURCES)[number];

export const GEM_TRACKING_ENVIRONMENTS = ['production', 'staging', 'development'] as const;
export type GemTrackingEnvironment = (typeof GEM_TRACKING_ENVIRONMENTS)[number];

export type MetaAndromedaDataProcessingOption = 'LDU';

export type MetaAndromedaPrivacyConfig = {
  readonly options: readonly MetaAndromedaDataProcessingOption[];
  readonly country: number;
  readonly state: number;
};

const metaAndromedaOptionsListSchema = z.array(z.literal('LDU'));

export const gemSchemaVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'GEM_SCHEMA_VERSION must use semver format (e.g. 2.4.0)');

export const gemTrackingEnvironmentSchema = z.enum(GEM_TRACKING_ENVIRONMENTS);

export const metaCapiDataSourceSchema = z.enum(META_CAPI_DATA_SOURCES);

/** Parses `META_ANDROMEDA_DATA_PROCESSING_OPTIONS` JSON array (e.g. `["LDU"]` or `[]`). */
export function parseMetaAndromedaDataProcessingOptionsList(
  raw: string,
): readonly MetaAndromedaDataProcessingOption[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      'META_ANDROMEDA_DATA_PROCESSING_OPTIONS must be valid JSON (e.g. ["LDU"] or []).',
    );
  }

  const result = metaAndromedaOptionsListSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      'META_ANDROMEDA_DATA_PROCESSING_OPTIONS must be a JSON array of "LDU" tokens (or []).',
    );
  }

  return result.data;
}

export function buildMetaAndromedaPrivacyConfig(input: {
  readonly optionsRaw: string;
  readonly country: number;
  readonly state: number;
}): MetaAndromedaPrivacyConfig {
  return {
    options: parseMetaAndromedaDataProcessingOptionsList(input.optionsRaw),
    country: input.country,
    state: input.state,
  };
}

/** Maps Octopus CAPI data source to Meta `action_source`. */
export function resolveMetaCapiActionSource(dataSource: MetaCapiDataSource): string {
  return dataSource === 'system_generated' ? 'system_generated' : 'website';
}

export function applyMetaAndromedaPrivacyFields(
  event: Record<string, unknown>,
  config: MetaAndromedaPrivacyConfig,
): void {
  event.data_processing_options = [...config.options];
  event.data_processing_options_country = config.country;
  event.data_processing_options_state = config.state;
}
