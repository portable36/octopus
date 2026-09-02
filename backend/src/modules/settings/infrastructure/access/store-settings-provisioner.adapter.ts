import { Inject, Injectable } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import type {
  ProvisionerResult,
  StoreSettingsProvisionerPort,
  StoreSettingsProvisionInput,
} from '../../../../shared-kernel/application/ports/store-settings-provisioner.port';
import {
  CONFIGURATION_REPOSITORY,
  type ConfigurationRepository,
} from '../../application/ports/configuration-repository.interface';

@Injectable()
export class StoreSettingsProvisionerAdapter implements StoreSettingsProvisionerPort {
  constructor(
    @Inject(CONFIGURATION_REPOSITORY) private readonly configs: ConfigurationRepository,
  ) {}

  public async provision(input: StoreSettingsProvisionInput): Promise<ProvisionerResult> {
    try {
      const scope = {
        kind: 'store' as const,
        vendorId: input.vendorId,
        storeId: input.storeId,
      };
      const generalExisting = await this.configs.findByScopeKey('general', scope);
      await this.configs.save({
        id: generalExisting?.id ?? UniqueID.create().value,
        key: 'general',
        scope,
        schemaVersion: 1,
        payload: input.general,
        updatedBy: input.actorUserId,
      });
      const brandingExisting = await this.configs.findByScopeKey('branding', scope);
      await this.configs.save({
        id: brandingExisting?.id ?? UniqueID.create().value,
        key: 'branding',
        scope,
        schemaVersion: 1,
        payload: input.branding,
        updatedBy: input.actorUserId,
      });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Settings provisioning failed.';
      return { success: false, error: message };
    }
  }
}
