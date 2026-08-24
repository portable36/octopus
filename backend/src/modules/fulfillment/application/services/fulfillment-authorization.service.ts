import { Inject, Injectable } from '@nestjs/common';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import type { Shipment } from '../../domain/aggregates/shipment.aggregate';
import { FulfillmentAccessDeniedError } from '../errors/fulfillment.errors';

@Injectable()
export class FulfillmentAuthorizationService {
  constructor(
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public async requireFulfiller(
    shipment: Pick<Shipment, 'storeId' | 'vendorId'>,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return;
    }
    const store = await this.stores.findById(shipment.storeId);
    if (store?.managerUserIds.includes(actorUserId) || store?.staffUserIds.includes(actorUserId)) {
      return;
    }
    const vendor = await this.vendors.findById(shipment.vendorId);
    if (
      vendor &&
      (vendor.ownerUserId === actorUserId || vendor.staffUserIds.includes(actorUserId))
    ) {
      return;
    }
    throw new FulfillmentAccessDeniedError();
  }
}
