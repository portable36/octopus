import { Inject, Injectable } from '@nestjs/common';
import { VendorAccessDeniedError, VendorNotFoundError } from '../errors/vendor.errors';
import { VENDOR_REPOSITORY, type VendorRepository } from '../ports/vendor-repository.interface';
import type { Vendor } from '../../domain/aggregates/vendor.aggregate';

@Injectable()
export class GetVendorHandler {
  constructor(@Inject(VENDOR_REPOSITORY) private readonly vendors: VendorRepository) {}

  public async byId(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Vendor> {
    const vendor = await this.vendors.findById(vendorId);
    if (!vendor) {
      throw new VendorNotFoundError();
    }

    if (actorRoles.includes('PLATFORM_ADMIN') || vendor.hasStaff(actorUserId)) {
      return vendor;
    }

    throw new VendorAccessDeniedError();
  }

  public async forActor(actorUserId: string): Promise<Vendor[]> {
    return this.vendors.findByStaffUserId(actorUserId);
  }
}
