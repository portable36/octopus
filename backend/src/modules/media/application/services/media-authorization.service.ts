import { Inject, Injectable } from '@nestjs/common';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
  type VendorAccessSnapshot,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import { MediaAccessDeniedError } from '../errors/media.errors';

@Injectable()
export class MediaAuthorizationService {
  constructor(@Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort) {}

  public async requireActiveVendor(vendorId: string): Promise<VendorAccessSnapshot> {
    const vendor = await this.vendors.findById(vendorId);
    if (!vendor) {
      throw new MediaAccessDeniedError('Vendor not found.');
    }
    if (vendor.status !== 'active') {
      throw new MediaAccessDeniedError('Vendor is not active.');
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
    throw new MediaAccessDeniedError();
  }
}
