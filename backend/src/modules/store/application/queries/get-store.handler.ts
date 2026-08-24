import { Inject, Injectable } from '@nestjs/common';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import type { Store } from '../../domain/aggregates/store.aggregate';
import { StoreAccessDeniedError, StoreNotFoundError } from '../errors/store.errors';
import { STORE_REPOSITORY, type StoreRepository } from '../ports/store-repository.interface';

@Injectable()
export class GetStoreHandler {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public async byId(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Store> {
    const store = await this.stores.findById(storeId);
    if (!store) {
      throw new StoreNotFoundError();
    }

    if (actorRoles.includes('PLATFORM_ADMIN') || store.hasStaff(actorUserId)) {
      return store;
    }

    const vendor = await this.vendors.findById(store.vendorId);
    if (vendor && vendor.staffUserIds.includes(actorUserId)) {
      return store;
    }

    throw new StoreAccessDeniedError();
  }

  public async forVendor(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Store[]> {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      const vendor = await this.vendors.findById(vendorId);
      if (!vendor || !vendor.staffUserIds.includes(actorUserId)) {
        throw new StoreAccessDeniedError();
      }
    }
    return this.stores.findByVendorId(vendorId);
  }

  public async forActor(actorUserId: string): Promise<Store[]> {
    return this.stores.findByStaffUserId(actorUserId);
  }

  public async listAllForPlatform(actorRoles: readonly string[]): Promise<Store[]> {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      throw new StoreAccessDeniedError();
    }
    return this.stores.listAll();
  }
}
