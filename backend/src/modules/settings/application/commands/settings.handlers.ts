import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
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
  toStorefrontPublicConfig,
  type StorefrontPublicConfig,
} from '../mappers/storefront-public-config';
import {
  CONFIGURATION_REPOSITORY,
  type ConfigurationRepository,
} from '../ports/configuration-repository.interface';
import {
  STOREFRONT_CONFIG_CACHE,
  type StorefrontConfigCachePort,
} from '../ports/storefront-config-cache.port';
import { SettingsAuthorizationService } from '../services/settings-authorization.service';

@Injectable()
export class SettingsHandlers {
  constructor(
    @Inject(CONFIGURATION_REPOSITORY) private readonly configs: ConfigurationRepository,
    private readonly authz: SettingsAuthorizationService,
    @Inject(STOREFRONT_CONFIG_CACHE) private readonly storefrontCache: StorefrontConfigCachePort,
    @Optional() @Inject(AUDIT_PORT) private readonly audit: AuditPort | null = null,
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
   * Callers must strip marketing secrets before any public response (see toStorefrontPublicConfig).
   */
  public async getEffectivePublic(
    key: ConfigurationKey,
    scope: ConfigurationScope,
  ): Promise<GeneralSettings | BrandingSettings | MarketingSettings> {
    return this.resolveEffective(key, scope);
  }

  public async getStorefrontPublicConfig(
    scope: ConfigurationScope,
  ): Promise<StorefrontPublicConfig> {
    const cached = await this.storefrontCache.get(scope);
    if (cached) {
      return cached;
    }

    const [general, branding, marketing] = await Promise.all([
      this.resolveEffective('general', scope) as Promise<GeneralSettings>,
      this.resolveEffective('branding', scope) as Promise<BrandingSettings>,
      this.resolveEffective('marketing', scope) as Promise<MarketingSettings>,
    ]);
    const body = toStorefrontPublicConfig({ scope, general, branding, marketing });
    await this.storefrontCache.set(scope, body);
    return body;
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
    const saved = await this.configs.save({
      id: existing?.id ?? UniqueID.create().value,
      key: input.key,
      scope: input.scope,
      schemaVersion: 1,
      payload: { ...input.payload, schemaVersion: 1 },
      updatedBy: input.actorUserId,
    });
    await this.storefrontCache.invalidateAll();
    await this.audit?.append({
      actorUserId: input.actorUserId,
      action: 'settings.upserted',
      resourceType: 'configuration',
      resourceId: saved.id,
      vendorId: input.scope.kind === 'platform' ? null : input.scope.vendorId,
      storeId: input.scope.kind === 'store' ? input.scope.storeId : null,
      before: existing ? { key: existing.key, payload: existing.payload } : null,
      after: { key: saved.key, payload: saved.payload },
      metadata: { scopeKind: input.scope.kind },
    });
    return saved;
  }
}
