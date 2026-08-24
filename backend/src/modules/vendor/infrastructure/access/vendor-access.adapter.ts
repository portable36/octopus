import { Injectable, Inject } from '@nestjs/common';
import type {
  VendorAccessPort,
  VendorAccessSnapshot,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import {
  VENDOR_REPOSITORY,
  type VendorRepository,
} from '../../application/ports/vendor-repository.interface';

@Injectable()
export class VendorAccessAdapter implements VendorAccessPort {
  constructor(@Inject(VENDOR_REPOSITORY) private readonly vendors: VendorRepository) {}

  public async findById(vendorId: string): Promise<VendorAccessSnapshot | null> {
    const vendor = await this.vendors.findById(vendorId);
    if (!vendor) {
      return null;
    }

    return {
      vendorId: vendor.id.value,
      status: vendor.status,
      ownerUserId: vendor.ownerUserId,
      staffUserIds: vendor.staff.map((member) => member.userId),
      currencyCode: vendor.settings.currencyCode,
      codEnabled: vendor.settings.codEnabled,
      codMinAmountMinor: vendor.settings.codMinAmountMinor,
      codMaxAmountMinor: vendor.settings.codMaxAmountMinor,
      codReservationTtlHours: vendor.settings.codReservationTtlHours,
    };
  }
}
