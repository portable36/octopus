import { Inject, Injectable, Logger } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  POS_PROVISIONER,
  type PosProvisionerPort,
} from '../../../../shared-kernel/application/ports/pos-provisioner.port';
import {
  STORE_SETTINGS_PROVISIONER,
  type StoreSettingsProvisionerPort,
} from '../../../../shared-kernel/application/ports/store-settings-provisioner.port';
import {
  WAREHOUSE_PROVISIONER,
  type WarehouseProvisionerPort,
} from '../../../../shared-kernel/application/ports/warehouse-provisioner.port';
import type { Store } from '../../domain/aggregates/store.aggregate';
import {
  PROVISIONING_STEP_NAMES,
  type ProvisioningStepName,
  type StoreWizardPayload,
} from '../../domain/store-onboarding.types';
import { STORE_PROVISIONING_REPOSITORY } from '../ports/store-provisioning-repository.interface';
import type { StoreProvisioningRepository } from '../ports/store-provisioning-repository.interface';
import { STORE_REPOSITORY, type StoreRepository } from '../ports/store-repository.interface';

export interface ProvisioningContext {
  readonly storeId: string;
  readonly runId: string;
  readonly vendorId: string;
  readonly actorUserId: string;
  readonly payload: StoreWizardPayload;
}

@Injectable()
export class StoreProvisioningOrchestrator {
  private readonly logger = new Logger(StoreProvisioningOrchestrator.name);

  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(STORE_PROVISIONING_REPOSITORY)
    private readonly provisioning: StoreProvisioningRepository,
    @Inject(STORE_SETTINGS_PROVISIONER)
    private readonly settingsProvisioner: StoreSettingsProvisionerPort,
    @Inject(WAREHOUSE_PROVISIONER) private readonly warehouseProvisioner: WarehouseProvisionerPort,
    @Inject(POS_PROVISIONER) private readonly posProvisioner: PosProvisionerPort,
  ) {}

  public async execute(context: ProvisioningContext): Promise<void> {
    const store = await this.stores.findById(context.storeId);
    if (!store) {
      throw new Error('Store not found for provisioning.');
    }

    for (const stepName of PROVISIONING_STEP_NAMES) {
      const existing = await this.provisioning.findStep(context.runId, stepName);
      if (existing?.status === 'completed') {
        continue;
      }

      await this.provisioning.markStepStatus(context.runId, stepName, 'running');
      try {
        await this.runStep(stepName, store, context);
        await this.provisioning.markStepStatus(context.runId, stepName, 'completed');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Provisioning step failed.';
        this.logger.warn(
          `Provisioning step ${stepName} failed for store ${context.storeId}: ${message}`,
        );
        await this.provisioning.markStepStatus(context.runId, stepName, 'failed', {
          error: message,
        });
        const run = await this.provisioning.findLatestRunByStoreId(context.storeId);
        if (run) {
          await this.provisioning.updateRun({
            ...run,
            status: 'failed',
            lastError: message,
            completedAt: new Date(),
          });
        }
        store.markProvisioningFailed(context.actorUserId, message);
        await this.stores.save(store);
        return;
      }
    }

    const run = await this.provisioning.findLatestRunByStoreId(context.storeId);
    if (run) {
      await this.provisioning.updateRun({
        ...run,
        status: 'completed',
        lastError: null,
        completedAt: new Date(),
      });
    }
  }

  private async runStep(
    stepName: ProvisioningStepName,
    store: Store,
    context: ProvisioningContext,
  ): Promise<void> {
    switch (stepName) {
      case 'StoreIdentityFinalized':
        await this.finalizeIdentity(store, context);
        return;
      case 'DefaultSettingsProvisioned':
        await this.provisionSettings(store, context);
        return;
      case 'CatalogConfigured':
        return;
      case 'WarehouseProvisioned':
        await this.provisionWarehouse(store, context);
        return;
      case 'PosProvisioned':
        await this.provisionPos(store, context);
        return;
      case 'ProvisioningCompleted':
        store.completeProvisioning(context.actorUserId);
        await this.stores.save(store);
        return;
      default: {
        const _exhaustive: never = stepName;
        throw new Error(`Unknown provisioning step: ${String(_exhaustive)}`);
      }
    }
  }

  private async finalizeIdentity(store: Store, context: ProvisioningContext): Promise<void> {
    const { basic, type, owner, location, domain, payment } = context.payload;
    if (basic?.displayName) {
      store.updateProfile({
        displayName: basic.displayName,
        ...(basic.description !== undefined ? { description: basic.description } : {}),
      });
    }
    store.updateContact({
      phone: basic?.phone ?? store.contact.phone,
      email: basic?.email ?? store.contact.email,
      supportEmail: basic?.supportEmail ?? store.contact.supportEmail,
    });
    if (type?.storeType || owner?.ownershipKind || basic?.storeCode) {
      store.updateIdentity({
        ...(type?.storeType ? { storeType: type.storeType } : {}),
        ...(owner?.ownershipKind ? { ownershipKind: owner.ownershipKind } : {}),
        ...(basic?.storeCode ? { storeCode: basic.storeCode } : {}),
      });
    }
    if (location) {
      store.updateAddress({
        ...(location.countryCode ? { countryCode: location.countryCode } : {}),
        ...(location.region !== undefined ? { region: location.region } : {}),
        ...(location.city !== undefined ? { city: location.city } : {}),
        ...(location.addressLine1 !== undefined ? { line1: location.addressLine1 } : {}),
        ...(location.addressLine2 !== undefined ? { line2: location.addressLine2 } : {}),
        ...(location.postalCode !== undefined ? { postalCode: location.postalCode } : {}),
        ...(location.latitude !== undefined ? { latitude: location.latitude } : {}),
        ...(location.longitude !== undefined ? { longitude: location.longitude } : {}),
      });
      if (location.openingHours) {
        store.updateOpeningHours(location.openingHours);
      }
    }
    if (payment) {
      store.updateSettings({
        ...(payment.codEnabled !== undefined ? { codEnabled: payment.codEnabled } : {}),
        ...(payment.acceptsOnlineOrders !== undefined
          ? { acceptsOnlineOrders: payment.acceptsOnlineOrders }
          : {}),
      });
    }
    if (basic?.currencyCode || basic?.timezone || basic?.locale) {
      store.updateSettings({
        ...(basic.currencyCode ? { currencyCode: basic.currencyCode } : {}),
        ...(basic.timezone ? { timezone: basic.timezone } : {}),
        ...(basic.locale ? { locale: basic.locale } : {}),
      });
    }
    if (domain?.hostname) {
      const hostname = domain.hostname.trim().toLowerCase();
      if (await this.provisioning.existsHostname(hostname)) {
        throw new Error('Store domain hostname is already taken.');
      }
      await this.provisioning.saveDomain({
        id: UniqueID.create().value,
        storeId: store.id.value,
        hostname,
        kind: domain.kind ?? 'subdomain',
        isPrimary: true,
        verificationStatus: 'pending',
        createdAt: new Date(),
      });
    }
    await this.stores.save(store);
  }

  private async provisionSettings(store: Store, context: ProvisioningContext): Promise<void> {
    const { basic, branding } = context.payload;
    const result = await this.settingsProvisioner.provision({
      vendorId: context.vendorId,
      storeId: context.storeId,
      actorUserId: context.actorUserId,
      general: {
        schemaVersion: 1,
        supportEmail: basic?.supportEmail ?? store.contact.supportEmail,
        defaultLocale: basic?.locale ?? store.settings.locale,
        defaultCurrencyCode: basic?.currencyCode ?? store.settings.currencyCode,
        vendorRegistrationEnabled: false,
      },
      branding: {
        schemaVersion: 1,
        siteName: branding?.siteName ?? store.profile.displayName,
        tagline: branding?.tagline ?? null,
        primaryColor: branding?.primaryColor ?? null,
        logoMediaId: branding?.logoMediaId ?? null,
        faviconMediaId: null,
      },
    });
    if (!result.success) {
      throw new Error(result.error ?? 'Default settings provisioning failed.');
    }
  }

  private async provisionWarehouse(store: Store, context: ProvisioningContext): Promise<void> {
    const warehouse = context.payload.warehouse;
    const result = await this.warehouseProvisioner.provision({
      vendorId: context.vendorId,
      storeId: context.storeId,
      code: warehouse?.code ?? 'MAIN',
      name: warehouse?.name ?? `${store.profile.displayName} Warehouse`,
      addressLine: warehouse?.addressLine ?? store.address.line1,
    });
    if (!result.success) {
      throw new Error(result.error ?? 'Warehouse provisioning failed.');
    }
  }

  private async provisionPos(store: Store, context: ProvisioningContext): Promise<void> {
    if (context.payload.pos?.enabled === false) {
      return;
    }
    const result = await this.posProvisioner.provision({
      vendorId: context.vendorId,
      storeId: context.storeId,
      actorUserId: context.actorUserId,
      displayName: store.profile.displayName,
      locale: store.settings.locale,
      currencyCode: store.settings.currencyCode,
      addressLines: [
        store.address.line1,
        [store.address.city, store.address.region].filter(Boolean).join(', '),
      ].filter((line): line is string => Boolean(line && line.trim())),
    });
    if (!result.success) {
      throw new Error(result.error ?? 'POS provisioning failed.');
    }
  }
}
