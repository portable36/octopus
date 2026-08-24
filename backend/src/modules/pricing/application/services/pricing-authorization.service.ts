import { Inject, Injectable } from '@nestjs/common';
import {
  STORE_ACCESS,
  type StoreAccessPort,
  type StoreAccessSnapshot,
} from '../../../../shared-kernel/application/ports/store-access.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import { PricingAccessDeniedError } from '../errors/pricing.errors';

@Injectable()
export class PricingAuthorizationService {
  constructor(
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public async requireStore(storeId: string): Promise<StoreAccessSnapshot> {
    const store = await this.stores.findById(storeId);
    if (!store) {
      throw new PricingAccessDeniedError();
    }
    return store;
  }

  public async requireMutator(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<StoreAccessSnapshot> {
    const store = await this.requireStore(storeId);
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return store;
    }
    if (store.managerUserIds.includes(actorUserId)) {
      return store;
    }
    const vendor = await this.vendors.findById(store.vendorId);
    if (
      vendor &&
      (vendor.ownerUserId === actorUserId || vendor.staffUserIds.includes(actorUserId))
    ) {
      return store;
    }
    throw new PricingAccessDeniedError();
  }

  public async requireReader(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<StoreAccessSnapshot> {
    const store = await this.requireStore(storeId);
    if (actorRoles.includes('PLATFORM_ADMIN') || store.staffUserIds.includes(actorUserId)) {
      return store;
    }
    const vendor = await this.vendors.findById(store.vendorId);
    if (
      vendor &&
      (vendor.ownerUserId === actorUserId || vendor.staffUserIds.includes(actorUserId))
    ) {
      return store;
    }
    throw new PricingAccessDeniedError();
  }
}
