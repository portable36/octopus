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
import { Store } from '../../domain/aggregates/store.aggregate';
import {
  StoreAccessDeniedError,
  StoreSlugTakenError,
  VendorNotActiveForStoreError,
  VendorNotFoundForStoreError,
} from '../errors/store.errors';
import { STORE_REPOSITORY, type StoreRepository } from '../ports/store-repository.interface';

export interface CreateStoreCommand {
  readonly vendorId: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
  readonly displayName: string;
  readonly description?: string | null;
  readonly currencyCode?: string;
  readonly timezone?: string;
  readonly locale?: string;
  readonly countryCode?: string;
  readonly addressLine1?: string | null;
  readonly city?: string | null;
}

@Injectable()
export class CreateStoreHandler {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
    @Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectory,
    @Inject(USER_ROLE_ASSIGNER) private readonly roleAssigner: UserRoleAssigner,
  ) {}

  public async execute(command: CreateStoreCommand): Promise<Store> {
    const vendor = await this.vendors.findById(command.vendorId);
    if (!vendor) {
      throw new VendorNotFoundForStoreError();
    }
    if (vendor.status !== 'active') {
      throw new VendorNotActiveForStoreError();
    }

    const isAdmin = command.actorRoles.includes('PLATFORM_ADMIN');
    const isOwner = vendor.ownerUserId === command.actorUserId;
    const isVendorStaff = vendor.staffUserIds.includes(command.actorUserId);
    if (!isAdmin && !isOwner && !isVendorStaff) {
      throw new StoreAccessDeniedError();
    }

    const store = Store.create({
      vendorId: command.vendorId,
      displayName: command.displayName,
      managerUserId: command.actorUserId,
      ...(command.description !== undefined ? { description: command.description } : {}),
      ...(command.currencyCode !== undefined ? { currencyCode: command.currencyCode } : {}),
      ...(command.timezone !== undefined ? { timezone: command.timezone } : {}),
      ...(command.locale !== undefined ? { locale: command.locale } : {}),
      ...(command.countryCode !== undefined ? { countryCode: command.countryCode } : {}),
      ...(command.addressLine1 !== undefined ? { addressLine1: command.addressLine1 } : {}),
      ...(command.city !== undefined ? { city: command.city } : {}),
    });

    if (await this.stores.existsByVendorAndSlug(command.vendorId, store.profile.slug)) {
      throw new StoreSlugTakenError();
    }

    await this.stores.save(store);
    await this.memberships.assignStoreMembership(
      command.actorUserId,
      command.vendorId,
      store.id.value,
    );
    await this.roleAssigner.ensureRoles(command.actorUserId, ['STORE_MANAGER']);
    return store;
  }
}
