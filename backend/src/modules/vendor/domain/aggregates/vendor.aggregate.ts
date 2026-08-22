import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  CannotRemoveLastOwnerError,
  InvalidVendorStatusTransitionError,
  VendorDomainError,
  VendorNotOperableError,
  VendorStaffAlreadyExistsError,
  VendorStaffNotFoundError,
} from '../errors/vendor.errors';
import type {
  VendorBusinessInfo,
  VendorContactInfo,
  VendorProfile,
  VendorSettings,
  VendorStaffMember,
  VendorStaffRole,
  VendorStatus,
} from '../vendor.types';

interface VendorProps {
  profile: VendorProfile;
  business: VendorBusinessInfo;
  contact: VendorContactInfo;
  settings: VendorSettings;
  status: VendorStatus;
  ownerUserId: string;
  staff: readonly VendorStaffMember[];
  rejectionReason: string | null;
}

const ALLOWED_TRANSITIONS: Record<VendorStatus, VendorStatus[]> = {
  pending: ['under_review', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['active', 'suspended'],
  active: ['suspended'],
  suspended: ['active'],
  rejected: ['pending'],
};

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export class Vendor extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: VendorProps,
  ) {
    super(id);
  }

  public static register(input: {
    readonly displayName: string;
    readonly legalName: string;
    readonly contactEmail: string;
    readonly ownerUserId: string;
    readonly countryCode?: string;
    readonly phone?: string | null;
    readonly description?: string | null;
    readonly registrationNumber?: string | null;
    readonly taxId?: string | null;
    readonly currencyCode?: string;
    readonly timezone?: string;
  }): Vendor {
    const displayName = input.displayName.trim();
    if (displayName.length < 2) {
      throw new VendorDomainError('Display name must be at least 2 characters.');
    }

    const slug = slugify(displayName);
    if (slug.length < 2) {
      throw new VendorDomainError('Unable to derive a valid vendor slug.');
    }

    const now = new Date();
    const vendor = new Vendor(UniqueID.create(), {
      profile: {
        displayName,
        slug,
        description: input.description?.trim() || null,
      },
      business: {
        legalName: input.legalName.trim(),
        registrationNumber: input.registrationNumber?.trim() || null,
        taxId: input.taxId?.trim() || null,
      },
      contact: {
        email: input.contactEmail.trim().toLowerCase(),
        phone: input.phone?.trim() || null,
        addressLine: null,
        city: null,
        countryCode: (input.countryCode ?? 'BD').toUpperCase(),
      },
      settings: {
        currencyCode: (input.currencyCode ?? 'BDT').toUpperCase(),
        timezone: input.timezone ?? 'Asia/Dhaka',
        acceptsOnlineOrders: false,
      },
      status: 'pending',
      ownerUserId: input.ownerUserId,
      staff: [
        {
          userId: input.ownerUserId,
          role: 'VENDOR_OWNER',
          addedAt: now,
        },
      ],
      rejectionReason: null,
    });

    vendor.addEvent('VendorCreated', {
      vendorId: vendor.id.value,
      ownerUserId: input.ownerUserId,
      slug: vendor.props.profile.slug,
    });

    return vendor;
  }

  public static rehydrate(input: {
    readonly id: string;
    readonly profile: VendorProfile;
    readonly business: VendorBusinessInfo;
    readonly contact: VendorContactInfo;
    readonly settings: VendorSettings;
    readonly status: VendorStatus;
    readonly ownerUserId: string;
    readonly staff: readonly VendorStaffMember[];
    readonly rejectionReason: string | null;
  }): Vendor {
    return new Vendor(UniqueID.from(input.id), {
      profile: input.profile,
      business: input.business,
      contact: input.contact,
      settings: input.settings,
      status: input.status,
      ownerUserId: input.ownerUserId,
      staff: input.staff,
      rejectionReason: input.rejectionReason,
    });
  }

  get status(): VendorStatus {
    return this.props.status;
  }

  get profile(): VendorProfile {
    return this.props.profile;
  }

  get business(): VendorBusinessInfo {
    return this.props.business;
  }

  get contact(): VendorContactInfo {
    return this.props.contact;
  }

  get settings(): VendorSettings {
    return this.props.settings;
  }

  get ownerUserId(): string {
    return this.props.ownerUserId;
  }

  get staff(): readonly VendorStaffMember[] {
    return this.props.staff;
  }

  get rejectionReason(): string | null {
    return this.props.rejectionReason;
  }

  public submitForReview(): void {
    this.assertTransition('under_review');
    this.props = { ...this.props, status: 'under_review', rejectionReason: null };
    this.addEvent('VendorSubmittedForReview', { vendorId: this.id.value });
  }

  public approve(actorUserId: string): void {
    this.assertTransition('approved');
    this.props = { ...this.props, status: 'approved', rejectionReason: null };
    this.addEvent('VendorApproved', { vendorId: this.id.value, actorUserId });
  }

  public reject(actorUserId: string, reason: string): void {
    this.assertTransition('rejected');
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      throw new VendorDomainError('Rejection reason is required.');
    }
    this.props = { ...this.props, status: 'rejected', rejectionReason: trimmed };
    this.addEvent('VendorRejected', {
      vendorId: this.id.value,
      actorUserId,
      reason: trimmed,
    });
  }

  public activate(): void {
    this.assertTransition('active');
    this.props = { ...this.props, status: 'active' };
    this.addEvent('VendorActivated', { vendorId: this.id.value });
  }

  public suspend(actorUserId: string, reason?: string): void {
    this.assertTransition('suspended');
    this.props = { ...this.props, status: 'suspended' };
    this.addEvent('VendorSuspended', {
      vendorId: this.id.value,
      actorUserId,
      reason: reason?.trim() || null,
    });
  }

  public reopenAfterRejection(): void {
    this.assertTransition('pending');
    this.props = { ...this.props, status: 'pending', rejectionReason: null };
    this.addEvent('VendorReopened', { vendorId: this.id.value });
  }

  public updateProfile(patch: {
    readonly displayName?: string;
    readonly description?: string | null;
    readonly phone?: string | null;
    readonly addressLine?: string | null;
    readonly city?: string | null;
  }): void {
    this.assertMutable();
    this.props = {
      ...this.props,
      profile: {
        ...this.props.profile,
        displayName: patch.displayName?.trim() || this.props.profile.displayName,
        description:
          patch.description === undefined
            ? this.props.profile.description
            : patch.description?.trim() || null,
      },
      contact: {
        ...this.props.contact,
        phone: patch.phone === undefined ? this.props.contact.phone : patch.phone?.trim() || null,
        addressLine:
          patch.addressLine === undefined
            ? this.props.contact.addressLine
            : patch.addressLine?.trim() || null,
        city: patch.city === undefined ? this.props.contact.city : patch.city?.trim() || null,
      },
    };
    this.addEvent('VendorProfileUpdated', { vendorId: this.id.value });
  }

  public updateSettings(patch: Partial<VendorSettings>): void {
    this.assertMutable();
    this.props = {
      ...this.props,
      settings: {
        ...this.props.settings,
        ...patch,
      },
    };
    this.addEvent('VendorSettingsUpdated', { vendorId: this.id.value });
  }

  public addStaff(userId: string, role: VendorStaffRole): void {
    this.assertMutable();
    if (this.props.staff.some((member) => member.userId === userId)) {
      throw new VendorStaffAlreadyExistsError();
    }

    this.props = {
      ...this.props,
      staff: [...this.props.staff, { userId, role, addedAt: new Date() }],
    };
    this.addEvent('VendorStaffAdded', { vendorId: this.id.value, userId, role });
  }

  public removeStaff(userId: string): void {
    this.assertMutable();
    const member = this.props.staff.find((entry) => entry.userId === userId);
    if (!member) {
      throw new VendorStaffNotFoundError();
    }

    if (member.role === 'VENDOR_OWNER') {
      const owners = this.props.staff.filter((entry) => entry.role === 'VENDOR_OWNER');
      if (owners.length <= 1) {
        throw new CannotRemoveLastOwnerError();
      }
    }

    this.props = {
      ...this.props,
      staff: this.props.staff.filter((entry) => entry.userId !== userId),
    };
    this.addEvent('VendorStaffRemoved', { vendorId: this.id.value, userId });
  }

  public hasStaff(userId: string): boolean {
    return this.props.staff.some((member) => member.userId === userId);
  }

  public isOwner(userId: string): boolean {
    return this.props.staff.some(
      (member) => member.userId === userId && member.role === 'VENDOR_OWNER',
    );
  }

  public assertOperable(): void {
    if (this.props.status !== 'active') {
      throw new VendorNotOperableError();
    }
  }

  private assertMutable(): void {
    if (this.props.status === 'rejected') {
      throw new VendorDomainError('Rejected vendors must be reopened before mutation.');
    }
  }

  private assertTransition(target: VendorStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(target)) {
      throw new InvalidVendorStatusTransitionError(this.props.status, target);
    }
  }
}
