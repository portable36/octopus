import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
import {
  MEMBERSHIP_DIRECTORY,
  type MembershipDirectory,
} from '../../../../shared-kernel/application/ports/membership-directory.port';
import {
  USER_ROLE_ASSIGNER,
  type UserRoleAssigner,
} from '../../../../shared-kernel/application/ports/user-role-assigner.port';
import type { VendorStaffRole } from '../../domain/vendor.types';
import { VendorAccessDeniedError, VendorNotFoundError } from '../errors/vendor.errors';
import { VENDOR_REPOSITORY, type VendorRepository } from '../ports/vendor-repository.interface';
import type { Vendor } from '../../domain/aggregates/vendor.aggregate';

function isPlatformAdmin(roles: readonly string[]): boolean {
  return roles.includes('PLATFORM_ADMIN');
}

@Injectable()
export class VendorLifecycleHandler {
  constructor(
    @Inject(VENDOR_REPOSITORY) private readonly vendors: VendorRepository,
    @Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectory,
    @Inject(USER_ROLE_ASSIGNER) private readonly roleAssigner: UserRoleAssigner,
    @Optional() @Inject(AUDIT_PORT) private readonly audit: AuditPort | null = null,
  ) {}

  public async submitForReview(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Vendor> {
    const vendor = await this.requireVendor(vendorId);
    this.assertOwnerOrAdmin(vendor, actorUserId, actorRoles);
    vendor.submitForReview();
    await this.vendors.save(vendor);
    return vendor;
  }

  public async approve(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Vendor> {
    this.assertPlatformAdmin(actorRoles);
    const vendor = await this.requireVendor(vendorId);
    if (vendor.status === 'pending') {
      vendor.submitForReview();
    }
    vendor.approve(actorUserId);
    await this.vendors.save(vendor);
    await this.audit?.append({
      actorUserId,
      action: 'vendor.approved',
      resourceType: 'vendor',
      resourceId: vendorId,
      vendorId,
      after: { status: vendor.status },
    });
    return vendor;
  }

  public async reject(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    reason: string,
  ): Promise<Vendor> {
    this.assertPlatformAdmin(actorRoles);
    const vendor = await this.requireVendor(vendorId);
    vendor.reject(actorUserId, reason);
    await this.vendors.save(vendor);
    await this.audit?.append({
      actorUserId,
      action: 'vendor.rejected',
      resourceType: 'vendor',
      resourceId: vendorId,
      vendorId,
      after: { status: vendor.status },
      metadata: { reason },
    });
    return vendor;
  }

  public async activate(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Vendor> {
    const vendor = await this.requireVendor(vendorId);
    if (!isPlatformAdmin(actorRoles)) {
      this.assertOwner(vendor, actorUserId);
    }
    vendor.activate();
    await this.vendors.save(vendor);
    await this.audit?.append({
      actorUserId,
      action: 'vendor.activated',
      resourceType: 'vendor',
      resourceId: vendorId,
      vendorId,
      after: { status: vendor.status },
    });
    return vendor;
  }

  public async suspend(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    reason?: string,
  ): Promise<Vendor> {
    const vendor = await this.requireVendor(vendorId);
    if (!isPlatformAdmin(actorRoles)) {
      this.assertOwner(vendor, actorUserId);
    }
    vendor.suspend(actorUserId, reason);
    await this.vendors.save(vendor);
    await this.audit?.append({
      actorUserId,
      action: 'vendor.suspended',
      resourceType: 'vendor',
      resourceId: vendorId,
      vendorId,
      after: { status: vendor.status },
      metadata: reason !== undefined ? { reason } : null,
    });
    return vendor;
  }

  public async reopen(vendorId: string, actorUserId: string): Promise<Vendor> {
    const vendor = await this.requireVendor(vendorId);
    this.assertOwner(vendor, actorUserId);
    vendor.reopenAfterRejection();
    await this.vendors.save(vendor);
    return vendor;
  }

  public async addStaff(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    staffUserId: string,
    role: VendorStaffRole,
  ): Promise<Vendor> {
    const vendor = await this.requireVendor(vendorId);
    this.assertOwnerOrAdmin(vendor, actorUserId, actorRoles);
    vendor.addStaff(staffUserId, role);
    await this.vendors.save(vendor);
    await this.memberships.upsertVendorMembership(staffUserId, vendorId, []);
    await this.roleAssigner.ensureRoles(staffUserId, [role]);
    await this.audit?.append({
      actorUserId,
      action: 'permission.vendor_staff_added',
      resourceType: 'vendor',
      resourceId: vendorId,
      vendorId,
      after: { staffUserId, role },
    });
    return vendor;
  }

  public async removeStaff(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    staffUserId: string,
  ): Promise<Vendor> {
    const vendor = await this.requireVendor(vendorId);
    this.assertOwnerOrAdmin(vendor, actorUserId, actorRoles);
    vendor.removeStaff(staffUserId);
    await this.vendors.save(vendor);
    await this.memberships.removeVendorMembership(staffUserId, vendorId);
    await this.audit?.append({
      actorUserId,
      action: 'permission.vendor_staff_removed',
      resourceType: 'vendor',
      resourceId: vendorId,
      vendorId,
      after: { staffUserId },
    });
    return vendor;
  }

  private async requireVendor(vendorId: string): Promise<Vendor> {
    const vendor = await this.vendors.findById(vendorId);
    if (!vendor) {
      throw new VendorNotFoundError();
    }
    return vendor;
  }

  private assertPlatformAdmin(roles: readonly string[]): void {
    if (!isPlatformAdmin(roles)) {
      throw new VendorAccessDeniedError();
    }
  }

  private assertOwner(vendor: Vendor, actorUserId: string): void {
    if (!vendor.isOwner(actorUserId)) {
      throw new VendorAccessDeniedError();
    }
  }

  private assertOwnerOrAdmin(
    vendor: Vendor,
    actorUserId: string,
    actorRoles: readonly string[],
  ): void {
    if (isPlatformAdmin(actorRoles) || vendor.isOwner(actorUserId)) {
      return;
    }
    throw new VendorAccessDeniedError();
  }
}
