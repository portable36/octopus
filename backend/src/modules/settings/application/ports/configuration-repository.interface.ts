export const CONFIGURATION_REPOSITORY = Symbol('CONFIGURATION_REPOSITORY');

import type {
  ConfigurationDocumentRecord,
  ConfigurationKey,
  ConfigurationScope,
} from '../../domain/settings.types';

export interface ConfigurationRepository {
  findForResolution(
    key: ConfigurationKey,
    target: ConfigurationScope,
  ): Promise<ConfigurationDocumentRecord[]>;

  findByScopeKey(
    key: ConfigurationKey,
    scope: ConfigurationScope,
  ): Promise<ConfigurationDocumentRecord | null>;

  save(input: {
    readonly id: string;
    readonly key: ConfigurationKey;
    readonly scope: ConfigurationScope;
    readonly schemaVersion: number;
    readonly payload: Record<string, unknown>;
    readonly updatedBy: string;
  }): Promise<ConfigurationDocumentRecord>;
}
