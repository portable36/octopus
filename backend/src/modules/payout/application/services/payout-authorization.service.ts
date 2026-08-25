import { Inject, Injectable } from '@nestjs/common';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import { PayoutAccessDeniedError } from '../errors/payout.errors';

const PLATFORM = 'PLATFORM_ADMIN';
const VENDOR_OWNER = 'VENDOR_OWNER';

@Injectable()
export class PayoutAuthorizationService {
  constructor(
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
  ) {}

  public async requireRequester(
    vendorId: string,
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<{ readonly currencyCode: string }> {
    if (!actorRoles.includes(PLATFORM) && !actorRoles.includes(VENDOR_OWNER)) {
      throw new PayoutAccessDeniedError('Missing permission payout.request.');
    }
    await this.assertVendorStoreAccess(vendorId, storeId, actorUserId, actorRoles, true);
    const vendor = await this.vendors.findById(vendorId);
    if (!vendor) {
      throw new PayoutAccessDeniedError('Vendor not found.');
    }
    return { currencyCode: vendor.currencyCode };
  }

  public async requireReader(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    if (!actorRoles.includes(PLATFORM) && !actorRoles.includes(VENDOR_OWNER)) {
      throw new PayoutAccessDeniedError('Missing permission payout.read.');
    }
    if (actorRoles.includes(PLATFORM)) {
      return;
    }
    const vendor = await this.vendors.findById(vendorId);
    if (!vendor || vendor.ownerUserId !== actorUserId) {
      throw new PayoutAccessDeniedError();
    }
  }

  public requireApprover(actorRoles: readonly string[]): void {
    if (!actorRoles.includes(PLATFORM)) {
      throw new PayoutAccessDeniedError('Missing permission payout.approve.');
    }
  }

  public requireProcessor(actorRoles: readonly string[]): void {
    if (!actorRoles.includes(PLATFORM)) {
      throw new PayoutAccessDeniedError('Missing permission payout.process.');
    }
  }

  private async assertVendorStoreAccess(
    vendorId: string,
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    requireOwnerOrAdmin: boolean,
  ): Promise<void> {
    const store = await this.stores.findById(storeId);
    if (!store || store.vendorId !== vendorId) {
      throw new PayoutAccessDeniedError('Store does not belong to vendor.');
    }
    if (actorRoles.includes(PLATFORM)) {
      return;
    }
    if (!requireOwnerOrAdmin) {
      return;
    }
    const vendor = await this.vendors.findById(vendorId);
    if (!vendor || vendor.ownerUserId !== actorUserId) {
      throw new PayoutAccessDeniedError();
    }
  }
}
