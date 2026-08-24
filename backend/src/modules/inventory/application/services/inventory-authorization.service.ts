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
import { InventoryAccessDeniedError, WarehouseNotFoundError } from '../errors/inventory.errors';
import {
  WAREHOUSE_REPOSITORY,
  type WarehouseRepository,
} from '../ports/warehouse-repository.interface';
import type { Warehouse } from '../../domain/aggregates/warehouse.aggregate';

@Injectable()
export class InventoryAuthorizationService {
  constructor(
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
    @Inject(WAREHOUSE_REPOSITORY) private readonly warehouses: WarehouseRepository,
  ) {}

  public async requireStore(storeId: string): Promise<StoreAccessSnapshot> {
    const store = await this.stores.findById(storeId);
    if (!store) {
      throw new InventoryAccessDeniedError();
    }
    return store;
  }

  /** Mutations: managers, vendor owners/staff with inventory.adjust, platform admin. */
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
    throw new InventoryAccessDeniedError();
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
    throw new InventoryAccessDeniedError();
  }

  public async requireWarehouseForStore(warehouseId: string, storeId: string): Promise<Warehouse> {
    const warehouse = await this.warehouses.findById(warehouseId);
    if (!warehouse || warehouse.storeId !== storeId) {
      throw new WarehouseNotFoundError();
    }
    return warehouse;
  }
}
