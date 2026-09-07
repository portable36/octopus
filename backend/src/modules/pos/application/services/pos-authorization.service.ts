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
import { PosAccessDeniedError, PosStoreNotFoundError } from '../errors/pos.errors';

@Injectable()
export class PosAuthorizationService {
  constructor(
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public async requireStore(storeId: string): Promise<StoreAccessSnapshot> {
    const store = await this.stores.findById(storeId);
    if (!store) {
      throw new PosStoreNotFoundError();
    }
    return store;
  }

  /** Managers, vendor owners, platform admins — template customization. */
  public async requireTemplateManager(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<StoreAccessSnapshot> {
    const store = await this.requireStore(storeId);
    if (actorRoles.includes('PLATFORM_ADMIN') || store.managerUserIds.includes(actorUserId)) {
      return store;
    }
    const vendor = await this.vendors.findById(store.vendorId);
    if (vendor && vendor.ownerUserId === actorUserId) {
      return store;
    }
    throw new PosAccessDeniedError();
  }

  /** Any store staff, vendor staff/owner, or platform admin — view/print. */
  public async requireReceiptViewer(
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
    throw new PosAccessDeniedError();
  }

  /** Managers, vendor owners, platform admins — configure registers. */
  public async requireRegisterManager(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<StoreAccessSnapshot> {
    return this.requireTemplateManager(storeId, actorUserId, actorRoles);
  }

  /** Any store staff, vendor staff/owner, or platform admin — view registers. */
  public async requireRegisterViewer(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<StoreAccessSnapshot> {
    return this.requireReceiptViewer(storeId, actorUserId, actorRoles);
  }

  /** Store staff or admins who can operate shifts and registers. */
  public async requireShiftOperator(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<StoreAccessSnapshot> {
    return this.requireReceiptViewer(storeId, actorUserId, actorRoles);
  }

  /** Checks if actor has elevated manager, owner, or platform admin permissions. */
  public async isStoreManagerOrPlatformAdmin(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<boolean> {
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return true;
    }
    const store = await this.stores.findById(storeId);
    if (!store) {
      return false;
    }
    if (store.managerUserIds.includes(actorUserId)) {
      return true;
    }
    const vendor = await this.vendors.findById(store.vendorId);
    return vendor?.ownerUserId === actorUserId;
  }
}
