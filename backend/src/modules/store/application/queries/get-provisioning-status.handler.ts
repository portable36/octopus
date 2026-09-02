import { Inject, Injectable } from '@nestjs/common';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import type { ProvisioningRunWithSteps } from '../ports/store-provisioning-repository.interface';
import {
  STORE_PROVISIONING_REPOSITORY,
  type StoreProvisioningRepository,
} from '../ports/store-provisioning-repository.interface';
import { STORE_REPOSITORY, type StoreRepository } from '../ports/store-repository.interface';
import {
  StoreAccessDeniedError,
  StoreNotFoundError,
  StoreProvisioningNotFoundError,
} from '../errors/store.errors';

@Injectable()
export class GetProvisioningStatusHandler {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(STORE_PROVISIONING_REPOSITORY)
    private readonly provisioning: StoreProvisioningRepository,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public async execute(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<ProvisioningRunWithSteps> {
    const store = await this.stores.findById(storeId);
    if (!store) {
      throw new StoreNotFoundError();
    }
    await this.assertAccess(store.vendorId, actorUserId, actorRoles, store.hasStaff(actorUserId));

    const status = await this.provisioning.findLatestRunWithStepsByStoreId(storeId);
    if (!status) {
      throw new StoreProvisioningNotFoundError();
    }
    return status;
  }

  private async assertAccess(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    isStoreStaff: boolean,
  ): Promise<void> {
    if (actorRoles.includes('PLATFORM_ADMIN') || isStoreStaff) {
      return;
    }
    const vendor = await this.vendors.findById(vendorId);
    if (vendor && vendor.staffUserIds.includes(actorUserId)) {
      return;
    }
    if (vendor && vendor.ownerUserId === actorUserId) {
      return;
    }
    throw new StoreAccessDeniedError();
  }
}
