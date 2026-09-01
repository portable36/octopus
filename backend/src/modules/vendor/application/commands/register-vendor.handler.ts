import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
import {
  MEMBERSHIP_DIRECTORY,
  type MembershipDirectory,
} from '../../../../shared-kernel/application/ports/membership-directory.port';
import {
  USER_DIRECTORY,
  type UserDirectory,
} from '../../../../shared-kernel/application/ports/user-directory.port';
import {
  USER_ROLE_ASSIGNER,
  type UserRoleAssigner,
} from '../../../../shared-kernel/application/ports/user-role-assigner.port';
import {
  VENDOR_REGISTRATION_POLICY,
  type VendorRegistrationPolicy,
} from '../../../../shared-kernel/application/ports/vendor-registration-policy.port';
import { Vendor } from '../../domain/aggregates/vendor.aggregate';
import {
  VendorAccessDeniedError,
  VendorOwnerNotFoundError,
  VendorRegistrationDisabledError,
  VendorSlugTakenError,
} from '../errors/vendor.errors';
import { VENDOR_REPOSITORY, type VendorRepository } from '../ports/vendor-repository.interface';

export interface RegisterVendorCommand {
  readonly actorUserId: string;
  readonly actorRoles?: readonly string[];
  readonly displayName: string;
  readonly legalName: string;
  readonly contactEmail: string;
  readonly countryCode?: string;
  readonly phone?: string | null;
  readonly description?: string | null;
  readonly registrationNumber?: string | null;
  readonly taxId?: string | null;
}

export interface AdminRegisterVendorCommand extends Omit<RegisterVendorCommand, 'actorUserId'> {
  readonly actorUserId: string;
  readonly ownerUserId: string;
  readonly actorRoles: readonly string[];
}

@Injectable()
export class RegisterVendorHandler {
  constructor(
    @Inject(VENDOR_REPOSITORY) private readonly vendors: VendorRepository,
    @Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectory,
    @Inject(USER_ROLE_ASSIGNER) private readonly roleAssigner: UserRoleAssigner,
    @Inject(USER_DIRECTORY) private readonly users: UserDirectory,
    @Inject(VENDOR_REGISTRATION_POLICY)
    private readonly registrationPolicy: VendorRegistrationPolicy,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
  ) {}

  public async execute(command: RegisterVendorCommand): Promise<Vendor> {
    const canCreateWithoutPublicRegistration =
      command.actorRoles?.includes('PLATFORM_ADMIN') ||
      command.actorRoles?.includes('VENDOR_OWNER');
    if (!canCreateWithoutPublicRegistration && !(await this.registrationPolicy.isEnabled())) {
      throw new VendorRegistrationDisabledError();
    }
    return this.create(command.actorUserId, command);
  }

  public async createForPlatformAdmin(command: AdminRegisterVendorCommand): Promise<Vendor> {
    if (!command.actorRoles.includes('PLATFORM_ADMIN')) {
      throw new VendorAccessDeniedError();
    }
    if (!(await this.users.existsById(command.ownerUserId))) {
      throw new VendorOwnerNotFoundError();
    }
    const vendor = await this.create(command.ownerUserId, command);
    await this.audit.append({
      actorUserId: command.actorUserId,
      action: 'vendor.created_for_user',
      resourceType: 'vendor',
      resourceId: vendor.id.value,
      vendorId: vendor.id.value,
      after: { ownerUserId: command.ownerUserId, status: vendor.status },
    });
    return vendor;
  }

  private async create(
    ownerUserId: string,
    command: Omit<RegisterVendorCommand, 'actorUserId'> | RegisterVendorCommand,
  ): Promise<Vendor> {
    const vendor = Vendor.register({
      displayName: command.displayName,
      legalName: command.legalName,
      contactEmail: command.contactEmail,
      ownerUserId,
      ...(command.countryCode !== undefined ? { countryCode: command.countryCode } : {}),
      ...(command.phone !== undefined ? { phone: command.phone } : {}),
      ...(command.description !== undefined ? { description: command.description } : {}),
      ...(command.registrationNumber !== undefined
        ? { registrationNumber: command.registrationNumber }
        : {}),
      ...(command.taxId !== undefined ? { taxId: command.taxId } : {}),
    });

    if (await this.vendors.existsBySlug(vendor.profile.slug)) {
      throw new VendorSlugTakenError();
    }

    await this.vendors.save(vendor);
    await this.memberships.upsertVendorMembership(ownerUserId, vendor.id.value, []);
    await this.roleAssigner.ensureRoles(ownerUserId, ['VENDOR_OWNER']);
    return vendor;
  }
}
