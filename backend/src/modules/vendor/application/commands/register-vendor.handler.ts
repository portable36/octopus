import { Inject, Injectable } from '@nestjs/common';
import {
  MEMBERSHIP_DIRECTORY,
  type MembershipDirectory,
} from '../../../../shared-kernel/application/ports/membership-directory.port';
import {
  USER_ROLE_ASSIGNER,
  type UserRoleAssigner,
} from '../../../../shared-kernel/application/ports/user-role-assigner.port';
import { Vendor } from '../../domain/aggregates/vendor.aggregate';
import { VendorSlugTakenError } from '../errors/vendor.errors';
import { VENDOR_REPOSITORY, type VendorRepository } from '../ports/vendor-repository.interface';

export interface RegisterVendorCommand {
  readonly actorUserId: string;
  readonly displayName: string;
  readonly legalName: string;
  readonly contactEmail: string;
  readonly countryCode?: string;
  readonly phone?: string | null;
  readonly description?: string | null;
  readonly registrationNumber?: string | null;
  readonly taxId?: string | null;
}

@Injectable()
export class RegisterVendorHandler {
  constructor(
    @Inject(VENDOR_REPOSITORY) private readonly vendors: VendorRepository,
    @Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectory,
    @Inject(USER_ROLE_ASSIGNER) private readonly roleAssigner: UserRoleAssigner,
  ) {}

  public async execute(command: RegisterVendorCommand): Promise<Vendor> {
    const vendor = Vendor.register({
      displayName: command.displayName,
      legalName: command.legalName,
      contactEmail: command.contactEmail,
      ownerUserId: command.actorUserId,
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
    await this.memberships.upsertVendorMembership(command.actorUserId, vendor.id.value, []);
    await this.roleAssigner.ensureRoles(command.actorUserId, ['VENDOR_OWNER']);
    return vendor;
  }
}
