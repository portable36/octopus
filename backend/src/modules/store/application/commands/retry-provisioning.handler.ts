import { Inject, Injectable } from '@nestjs/common';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import type { Store } from '../../domain/aggregates/store.aggregate';
import {
  STORE_ONBOARDING_DRAFT_REPOSITORY,
  type StoreOnboardingDraftRepository,
} from '../ports/store-onboarding-draft-repository.interface';
import {
  STORE_PROVISIONING_REPOSITORY,
  type StoreProvisioningRepository,
} from '../ports/store-provisioning-repository.interface';
import { STORE_REPOSITORY, type StoreRepository } from '../ports/store-repository.interface';
import { StoreProvisioningOrchestrator } from '../provisioning/store-provisioning.orchestrator';
import {
  StoreAccessDeniedError,
  StoreNotFoundError,
  StoreProvisioningNotFoundError,
} from '../errors/store.errors';

@Injectable()
export class RetryProvisioningHandler {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(STORE_PROVISIONING_REPOSITORY)
    private readonly provisioning: StoreProvisioningRepository,
    @Inject(STORE_ONBOARDING_DRAFT_REPOSITORY)
    private readonly drafts: StoreOnboardingDraftRepository,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
    private readonly orchestrator: StoreProvisioningOrchestrator,
  ) {}

  public async execute(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    const store = await this.requireStore(storeId);
    await this.assertManagerOrVendorOwnerOrAdmin(store, actorUserId, actorRoles);

    if (store.status !== 'failed' && store.status !== 'provisioning') {
      throw new StoreProvisioningNotFoundError();
    }

    const existingRun = await this.provisioning.findLatestRunByStoreId(storeId);
    if (!existingRun) {
      throw new StoreProvisioningNotFoundError();
    }

    if (store.status === 'failed') {
      store.resumeProvisioning(actorUserId);
      await this.stores.save(store);
    }

    const run =
      existingRun.status === 'failed'
        ? await this.provisioning.createRun(storeId)
        : existingRun;

    const draft = await this.findDraftPayload(storeId);
    await this.orchestrator.execute({
      storeId,
      runId: run.id,
      vendorId: store.vendorId,
      actorUserId,
      payload: draft,
    });
  }

  private async findDraftPayload(storeId: string) {
    const draft = await this.drafts.findByStoreId(storeId);
    return draft?.payload ?? {};
  }

  private async requireStore(storeId: string): Promise<Store> {
    const store = await this.stores.findById(storeId);
    if (!store) {
      throw new StoreNotFoundError();
    }
    return store;
  }

  private async assertManagerOrVendorOwnerOrAdmin(
    store: Store,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    if (actorRoles.includes('PLATFORM_ADMIN') || store.isManager(actorUserId)) {
      return;
    }
    const vendor = await this.vendors.findById(store.vendorId);
    if (vendor && vendor.ownerUserId === actorUserId) {
      return;
    }
    throw new StoreAccessDeniedError();
  }
}
