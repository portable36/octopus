import {
  VENDOR_ACCESS,
  type VendorAccessPort,
  type VendorAccessSnapshot,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import { Inject, Injectable } from '@nestjs/common';
import {
  CatalogAccessDeniedError,
  VendorNotActiveForCatalogError,
  VendorNotFoundForCatalogError,
} from '../errors/catalog.errors';

@Injectable()
export class CatalogAuthorizationService {
  constructor(@Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort) {}

  public async requireActiveVendor(vendorId: string): Promise<VendorAccessSnapshot> {
    const vendor = await this.vendors.findById(vendorId);
    if (!vendor) {
      throw new VendorNotFoundForCatalogError();
    }
    if (vendor.status !== 'active') {
      throw new VendorNotActiveForCatalogError();
    }
    return vendor;
  }

  public assertCanMutate(
    vendor: VendorAccessSnapshot,
    actorUserId: string,
    actorRoles: readonly string[],
  ): void {
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return;
    }
    if (vendor.staffUserIds.includes(actorUserId)) {
      return;
    }
    throw new CatalogAccessDeniedError();
  }

  public assertCanRead(
    vendor: VendorAccessSnapshot | null,
    actorUserId: string,
    actorRoles: readonly string[],
  ): void {
    if (actorRoles.includes('PLATFORM_ADMIN') || actorRoles.includes('CUSTOMER')) {
      return;
    }
    if (vendor && vendor.staffUserIds.includes(actorUserId)) {
      return;
    }
    throw new CatalogAccessDeniedError();
  }
}
