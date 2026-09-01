import { Injectable, Inject } from '@nestjs/common';
import type {
  VendorAccessPort,
  VendorAccessSnapshot,
  VendorPublicSnapshot,
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

  public async findActivePublicBySlug(slug: string): Promise<VendorPublicSnapshot | null> {
    const vendor = await this.vendors.findBySlug(slug);
    if (!vendor || vendor.status !== 'active') {
      return null;
    }
    return toPublicSnapshot(vendor);
  }

  public async findActivePublicById(vendorId: string): Promise<VendorPublicSnapshot | null> {
    const vendor = await this.vendors.findById(vendorId);
    if (!vendor || vendor.status !== 'active') {
      return null;
    }
    return toPublicSnapshot(vendor);
  }
}

function toPublicSnapshot(vendor: {
  id: { value: string };
  profile: { slug: string; displayName: string; description: string | null };
}): VendorPublicSnapshot {
  return {
    vendorId: vendor.id.value,
    slug: vendor.profile.slug,
    displayName: vendor.profile.displayName,
    description: vendor.profile.description,
  };
}
