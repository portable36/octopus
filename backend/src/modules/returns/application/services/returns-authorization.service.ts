import { Inject, Injectable } from '@nestjs/common';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import type { ReturnRequest } from '../../domain/aggregates/return-request.aggregate';
import { ReturnsAccessDeniedError } from '../errors/returns.errors';

/** Mirrors identity RBAC grants (avoid cross-module identity imports). */
const PERM_ROLES = {
  'return.read': new Set([
    'PLATFORM_ADMIN',
    'VENDOR_OWNER',
    'VENDOR_STAFF',
    'STORE_MANAGER',
    'STORE_STAFF',
    'CUSTOMER',
  ]),
  'return.create': new Set(['PLATFORM_ADMIN', 'CUSTOMER']),
  'return.review': new Set(['PLATFORM_ADMIN', 'VENDOR_OWNER', 'VENDOR_STAFF', 'STORE_MANAGER']),
  'return.receive': new Set([
    'PLATFORM_ADMIN',
    'VENDOR_OWNER',
    'VENDOR_STAFF',
    'STORE_MANAGER',
    'STORE_STAFF',
  ]),
  'return.inspect': new Set([
    'PLATFORM_ADMIN',
    'VENDOR_OWNER',
    'VENDOR_STAFF',
    'STORE_MANAGER',
    'STORE_STAFF',
  ]),
} as const;

export type ReturnPermission = keyof typeof PERM_ROLES;

@Injectable()
export class ReturnsAuthorizationService {
  constructor(
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public requirePermission(actorRoles: readonly string[], permission: ReturnPermission): void {
    const allowed = PERM_ROLES[permission];
    if (!actorRoles.some((role) => allowed.has(role))) {
      throw new ReturnsAccessDeniedError(`Missing permission ${permission}.`);
    }
  }

  public async requireStaffScope(
    returnRequest: Pick<ReturnRequest, 'storeId' | 'vendorId'>,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return;
    }
    const store = await this.stores.findById(returnRequest.storeId);
    if (store?.managerUserIds.includes(actorUserId) || store?.staffUserIds.includes(actorUserId)) {
      return;
    }
    const vendor = await this.vendors.findById(returnRequest.vendorId);
    if (
      vendor &&
      (vendor.ownerUserId === actorUserId || vendor.staffUserIds.includes(actorUserId))
    ) {
      return;
    }
    throw new ReturnsAccessDeniedError();
  }

  public requireCustomerOwner(
    returnRequest: Pick<ReturnRequest, 'customerId'>,
    actorUserId: string,
  ): void {
    if (returnRequest.customerId !== actorUserId) {
      throw new ReturnsAccessDeniedError();
    }
  }
}
