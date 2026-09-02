import { Inject, Injectable } from '@nestjs/common';
import {
  MEMBERSHIP_DIRECTORY,
  type MembershipDirectory,
} from '../../../../shared-kernel/application/ports/membership-directory.port';
import {
  USER_ROLE_ASSIGNER,
  type UserRoleAssigner,
} from '../../../../shared-kernel/application/ports/user-role-assigner.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import type { Store } from '../../domain/aggregates/store.aggregate';
import type { StoreStaffRole } from '../../domain/store.types';
import {
  StoreAccessDeniedError,
  StoreNotFoundError,
  StoreProvisioningIncompleteError,
  VendorNotActiveForStoreError,
  VendorNotFoundForStoreError,
} from '../errors/store.errors';
import {
  STORE_PROVISIONING_REPOSITORY,
  type StoreProvisioningRepository,
} from '../ports/store-provisioning-repository.interface';
import { STORE_REPOSITORY, type StoreRepository } from '../ports/store-repository.interface';

function isPlatformAdmin(roles: readonly string[]): boolean {
  return roles.includes('PLATFORM_ADMIN');
}

@Injectable()
export class StoreLifecycleHandler {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(STORE_PROVISIONING_REPOSITORY)
    private readonly provisioning: StoreProvisioningRepository,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
    @Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectory,
    @Inject(USER_ROLE_ASSIGNER) private readonly roleAssigner: UserRoleAssigner,
  ) {}

  public async activate(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Store> {
    const store = await this.requireStore(storeId);
    await this.assertVendorActive(store.vendorId);
    await this.assertManagerOrVendorOwnerOrAdmin(store, actorUserId, actorRoles);

    if (store.status === 'provisioning') {
      const run = await this.provisioning.findLatestRunByStoreId(storeId);
      if (!run || run.status !== 'completed') {
        throw new StoreProvisioningIncompleteError();
      }
      store.completeProvisioning(actorUserId);
    } else if (
      store.status === 'draft' ||
      store.status === 'suspended' ||
      store.status === 'maintenance'
    ) {
      store.activate(actorUserId);
    } else {
      store.activate(actorUserId);
    }

    await this.stores.save(store);
    return store;
  }

  public async suspend(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    reason?: string,
  ): Promise<Store> {
    const store = await this.requireStore(storeId);
    await this.assertManagerOrVendorOwnerOrAdmin(store, actorUserId, actorRoles);
    store.suspend(actorUserId, reason);
    await this.stores.save(store);
    return store;
  }

  public async close(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Store> {
    const store = await this.requireStore(storeId);
    await this.assertManagerOrVendorOwnerOrAdmin(store, actorUserId, actorRoles);
    store.close(actorUserId);
    await this.stores.save(store);
    return store;
  }

  public async enableMaintenance(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    reason?: string,
  ): Promise<Store> {
    const store = await this.requireStore(storeId);
    await this.assertManagerOrVendorOwnerOrAdmin(store, actorUserId, actorRoles);
    store.enableMaintenance(actorUserId, reason);
    await this.stores.save(store);
    return store;
  }

  public async archive(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Store> {
    const store = await this.requireStore(storeId);
    await this.assertManagerOrVendorOwnerOrAdmin(store, actorUserId, actorRoles);
    store.archive(actorUserId);
    await this.stores.save(store);
    return store;
  }

  public async addStaff(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    staffUserId: string,
    role: StoreStaffRole,
  ): Promise<Store> {
    const store = await this.requireStore(storeId);
    await this.assertManagerOrVendorOwnerOrAdmin(store, actorUserId, actorRoles);
    store.addStaff(staffUserId, role);
    await this.stores.save(store);
    await this.memberships.assignStoreMembership(staffUserId, store.vendorId, storeId);
    await this.roleAssigner.ensureRoles(staffUserId, [role]);
    return store;
  }

  public async removeStaff(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    staffUserId: string,
  ): Promise<Store> {
    const store = await this.requireStore(storeId);
    await this.assertManagerOrVendorOwnerOrAdmin(store, actorUserId, actorRoles);
    store.removeStaff(staffUserId);
    await this.stores.save(store);
    await this.memberships.revokeStoreMembership(staffUserId, store.vendorId, storeId);
    return store;
  }

  private async requireStore(storeId: string): Promise<Store> {
    const store = await this.stores.findById(storeId);
    if (!store) {
      throw new StoreNotFoundError();
    }
    return store;
  }

  private async assertVendorActive(vendorId: string): Promise<void> {
    const vendor = await this.vendors.findById(vendorId);
    if (!vendor) {
      throw new VendorNotFoundForStoreError();
    }
    if (vendor.status !== 'active') {
      throw new VendorNotActiveForStoreError();
    }
  }

  private async assertManagerOrVendorOwnerOrAdmin(
    store: Store,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    if (isPlatformAdmin(actorRoles) || store.isManager(actorUserId)) {
      return;
    }

    const vendor = await this.vendors.findById(store.vendorId);
    if (vendor && vendor.ownerUserId === actorUserId) {
      return;
    }

    throw new StoreAccessDeniedError();
  }
}
