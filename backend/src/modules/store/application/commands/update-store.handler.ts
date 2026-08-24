import { Inject, Injectable } from '@nestjs/common';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import type { Store } from '../../domain/aggregates/store.aggregate';
import type { StoreAddress, StoreSettings } from '../../domain/store.types';
import { StoreAccessDeniedError, StoreNotFoundError } from '../errors/store.errors';
import { STORE_REPOSITORY, type StoreRepository } from '../ports/store-repository.interface';

@Injectable()
export class UpdateStoreHandler {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public async updateProfile(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    patch: {
      readonly displayName?: string;
      readonly description?: string | null;
    },
  ): Promise<Store> {
    const store = await this.requireManagerOrOwner(storeId, actorUserId, actorRoles);
    store.updateProfile(patch);
    await this.stores.save(store);
    return store;
  }

  public async updateAddress(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    patch: Partial<StoreAddress>,
  ): Promise<Store> {
    const store = await this.requireManagerOrOwner(storeId, actorUserId, actorRoles);
    store.updateAddress(patch);
    await this.stores.save(store);
    return store;
  }

  public async updateSettings(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    patch: Partial<StoreSettings>,
  ): Promise<Store> {
    const store = await this.requireManagerOrOwner(storeId, actorUserId, actorRoles);
    store.updateSettings(patch);
    await this.stores.save(store);
    return store;
  }

  private async requireManagerOrOwner(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Store> {
    const store = await this.stores.findById(storeId);
    if (!store) {
      throw new StoreNotFoundError();
    }
    if (actorRoles.includes('PLATFORM_ADMIN') || store.isManager(actorUserId)) {
      return store;
    }
    const vendor = await this.vendors.findById(store.vendorId);
    if (vendor && vendor.ownerUserId === actorUserId) {
      return store;
    }
    throw new StoreAccessDeniedError();
  }
}
