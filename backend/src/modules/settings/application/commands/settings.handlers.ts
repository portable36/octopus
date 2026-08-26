import { Inject, Injectable } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  resolveEffectiveBranding,
  resolveEffectiveGeneral,
  resolveEffectiveMarketing,
} from '../../domain/services/resolve-effective';
import type {
  BrandingSettings,
  ConfigurationKey,
  ConfigurationScope,
  GeneralSettings,
  MarketingSettings,
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
  }): Promise<GeneralSettings | BrandingSettings | MarketingSettings> {
    this.authz.assertCanRead(
      input.actorRoles,
      input.scope,
      input.actorVendorId,
      input.actorStoreIds,
    );

    return this.resolveEffective(input.key, input.scope);
  }

  /**
   * Public read of non-secret configuration keys (general / branding / marketing).
   * Callers must strip marketing secrets before any public response (see toPublicMarketingConfig).
   */
  public async getEffectivePublic(
    key: ConfigurationKey,
    scope: ConfigurationScope,
  ): Promise<GeneralSettings | BrandingSettings | MarketingSettings> {
    return this.resolveEffective(key, scope);
  }

  private async resolveEffective(
    key: ConfigurationKey,
    scope: ConfigurationScope,
  ): Promise<GeneralSettings | BrandingSettings | MarketingSettings> {
    const documents = await this.configs.findForResolution(key, scope);
    if (key === 'general') {
      return resolveEffectiveGeneral(documents, scope);
    }
    if (key === 'marketing') {
      return resolveEffectiveMarketing(documents, scope);
    }
    return resolveEffectiveBranding(documents, scope);
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
