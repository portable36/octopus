import { Inject, Injectable } from '@nestjs/common';
import { VendorAccessDeniedError, VendorNotFoundError } from '../errors/vendor.errors';
import { VENDOR_REPOSITORY, type VendorRepository } from '../ports/vendor-repository.interface';
import type { Vendor } from '../../domain/aggregates/vendor.aggregate';
import type { VendorSettings } from '../../domain/vendor.types';

@Injectable()
export class UpdateVendorHandler {
  constructor(@Inject(VENDOR_REPOSITORY) private readonly vendors: VendorRepository) {}

  public async updateProfile(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    patch: {
      readonly displayName?: string;
      readonly description?: string | null;
      readonly phone?: string | null;
      readonly addressLine?: string | null;
      readonly city?: string | null;
    },
  ): Promise<Vendor> {
    const vendor = await this.requireOwned(vendorId, actorUserId, actorRoles);
    vendor.updateProfile(patch);
    await this.vendors.save(vendor);
    return vendor;
  }

  public async updateSettings(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    patch: Partial<VendorSettings>,
  ): Promise<Vendor> {
    const vendor = await this.requireOwned(vendorId, actorUserId, actorRoles);
    vendor.updateSettings(patch);
    await this.vendors.save(vendor);
    return vendor;
  }

  private async requireOwned(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Vendor> {
    const vendor = await this.vendors.findById(vendorId);
    if (!vendor) {
      throw new VendorNotFoundError();
    }
    if (actorRoles.includes('PLATFORM_ADMIN') || vendor.isOwner(actorUserId)) {
      return vendor;
    }
    throw new VendorAccessDeniedError();
  }
}
