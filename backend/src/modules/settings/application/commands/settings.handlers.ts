import { Inject, Injectable } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  resolveEffectiveBranding,
  resolveEffectiveGeneral,
} from '../../domain/services/resolve-effective';
import type {
  BrandingSettings,
  ConfigurationKey,
  ConfigurationScope,
  GeneralSettings,
} from '../../domain/settings.types';
import {
  CONFIGURATION_REPOSITORY,
  type ConfigurationRepository,
} from '../ports/configuration-repository.interface';
import { SettingsAuthorizationService } from '../services/settings-authorization.service';

@Injectable()
export class SettingsHandlers {
  constructor(
    @Inject(CONFIGURATION_REPOSITORY) private readonly configs: ConfigurationRepository,
    private readonly authz: SettingsAuthorizationService,
  ) {}

  public async getEffective(input: {
    readonly key: ConfigurationKey;
    readonly scope: ConfigurationScope;
    readonly actorRoles: readonly string[];
    readonly actorVendorId: string | null;
    readonly actorStoreIds: readonly string[];
  }): Promise<GeneralSettings | BrandingSettings> {
    this.authz.assertCanRead(
      input.actorRoles,
      input.scope,
      input.actorVendorId,
      input.actorStoreIds,
    );

    const documents = await this.configs.findForResolution(input.key, input.scope);
    if (input.key === 'general') {
      return resolveEffectiveGeneral(documents, input.scope);
    }
    return resolveEffectiveBranding(documents, input.scope);
  }

  public async upsert(input: {
    readonly key: ConfigurationKey;
    readonly scope: ConfigurationScope;
    readonly payload: Record<string, unknown>;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly actorVendorId: string | null;
    readonly actorStoreIds: readonly string[];
  }) {
    this.authz.assertCanWrite(
      input.actorRoles,
      input.scope,
      input.actorVendorId,
      input.actorStoreIds,
    );

    const existing = await this.configs.findByScopeKey(input.key, input.scope);
    return this.configs.save({
      id: existing?.id ?? UniqueID.create().value,
      key: input.key,
      scope: input.scope,
      schemaVersion: 1,
      payload: { ...input.payload, schemaVersion: 1 },
      updatedBy: input.actorUserId,
    });
  }
}
