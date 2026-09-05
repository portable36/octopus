import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  CannotRemoveLastManagerError,
  InvalidStoreStatusTransitionError,
  StoreClosedError,
  StoreDomainError,
  StoreNotOperableError,
  StoreStaffAlreadyExistsError,
  StoreStaffNotFoundError,
} from '../errors/store.errors';
import type {
  StoreAddress,
  StoreContact,
  StoreOpeningHoursEntry,
  StoreOwnershipKind,
  StoreProfile,
  StoreSettings,
  StoreStaffMember,
  StoreStaffRole,
  StoreStatus,
  StoreType,
} from '../store.types';

interface StoreProps {
  vendorId: string;
  storeCode: string;
  storeType: StoreType;
  ownershipKind: StoreOwnershipKind;
  profile: StoreProfile;
  contact: StoreContact;
  address: StoreAddress;
  openingHours: readonly StoreOpeningHoursEntry[];
  settings: StoreSettings;
  status: StoreStatus;
  staff: readonly StoreStaffMember[];
}

const ALLOWED_TRANSITIONS: Record<StoreStatus, StoreStatus[]> = {
  draft: ['provisioning', 'active', 'closed', 'archived'],
  provisioning: ['active', 'failed'],
  failed: ['provisioning', 'archived'],
  active: ['suspended', 'maintenance', 'closed', 'archived'],
  suspended: ['active', 'maintenance', 'closed', 'archived'],
  maintenance: ['active', 'suspended', 'closed', 'archived'],
  archived: [],
  closed: [],
};

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeStoreCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

function deriveStoreCode(displayName: string): string {
  const base = normalizeStoreCode(displayName).replace(/-/g, '').slice(0, 8);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base || 'STORE'}-${suffix}`;
}

export class Store extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: StoreProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly vendorId: string;
    readonly displayName: string;
    readonly managerUserId: string;
    readonly storeCode?: string;
    readonly storeType?: StoreType;
    readonly ownershipKind?: StoreOwnershipKind;
    readonly description?: string | null;
    readonly currencyCode?: string;
    readonly timezone?: string;
    readonly locale?: string;
    readonly countryCode?: string;
    readonly addressLine1?: string | null;
    readonly city?: string | null;
    readonly phone?: string | null;
    readonly email?: string | null;
    readonly supportEmail?: string | null;
  }): Store {
    const displayName = input.displayName.trim();
    if (displayName.length < 2) {
      throw new StoreDomainError('Display name must be at least 2 characters.');
    }

    const slug = slugify(displayName);
    if (slug.length < 2) {
      throw new StoreDomainError('Unable to derive a valid store slug.');
    }

    const storeCode = input.storeCode
      ? normalizeStoreCode(input.storeCode)
      : deriveStoreCode(displayName);
    if (storeCode.length < 3) {
      throw new StoreDomainError('Store code must be at least 3 characters.');
    }

    const now = new Date();
    const store = new Store(UniqueID.create(), {
      vendorId: input.vendorId,
      storeCode,
      storeType: input.storeType ?? 'online',
      ownershipKind: input.ownershipKind ?? 'vendor_owned',
      profile: {
        displayName,
        slug,
        description: input.description?.trim() || null,
      },
      contact: {
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        supportEmail: input.supportEmail?.trim() || null,
      },
      address: {
        line1: input.addressLine1?.trim() || null,
        line2: null,
        city: input.city?.trim() || null,
        region: null,
        postalCode: null,
        countryCode: (input.countryCode ?? 'BD').toUpperCase(),
        latitude: null,
        longitude: null,
      },
      openingHours: [],
      settings: {
        currencyCode: (input.currencyCode ?? 'BDT').toUpperCase(),
        timezone: input.timezone ?? 'Asia/Dhaka',
        locale: input.locale ?? 'en-BD',
        acceptsOnlineOrders: false,
        codEnabled: false,
        codMinAmountMinor: 0,
        codMaxAmountMinor: null,
        codReservationTtlHours: 72,
      },
      status: 'draft',
      staff: [
        {
          userId: input.managerUserId,
          role: 'STORE_MANAGER',
          addedAt: now,
        },
      ],
    });

    store.addEvent('StoreCreated', {
      storeId: store.id.value,
      vendorId: input.vendorId,
      managerUserId: input.managerUserId,
      slug: store.props.profile.slug,
      storeCode: store.props.storeCode,
    });

    return store;
  }

  public static rehydrate(input: {
    readonly id: string;
    readonly vendorId: string;
    readonly storeCode: string;
    readonly storeType: StoreType;
    readonly ownershipKind: StoreOwnershipKind;
    readonly profile: StoreProfile;
    readonly contact: StoreContact;
    readonly address: StoreAddress;
    readonly openingHours: readonly StoreOpeningHoursEntry[];
    readonly settings: StoreSettings;
    readonly status: StoreStatus;
    readonly staff: readonly StoreStaffMember[];
  }): Store {
    return new Store(UniqueID.from(input.id), {
      vendorId: input.vendorId,
      storeCode: input.storeCode,
      storeType: input.storeType,
      ownershipKind: input.ownershipKind,
      profile: input.profile,
      contact: input.contact,
      address: input.address,
      openingHours: input.openingHours,
      settings: input.settings,
      status: input.status,
      staff: input.staff,
    });
  }

  get vendorId(): string {
    return this.props.vendorId;
  }

  get storeCode(): string {
    return this.props.storeCode;
  }

  get storeType(): StoreType {
    return this.props.storeType;
  }

  get ownershipKind(): StoreOwnershipKind {
    return this.props.ownershipKind;
  }

  get status(): StoreStatus {
    return this.props.status;
  }

  get profile(): StoreProfile {
    return this.props.profile;
  }

  get contact(): StoreContact {
    return this.props.contact;
  }

  get address(): StoreAddress {
    return this.props.address;
  }

  get openingHours(): readonly StoreOpeningHoursEntry[] {
    return this.props.openingHours;
  }

  get settings(): StoreSettings {
    return this.props.settings;
  }

  get staff(): readonly StoreStaffMember[] {
    return this.props.staff;
  }

  public startProvisioning(actorUserId: string): void {
    this.assertTransition('provisioning');
    this.props = { ...this.props, status: 'provisioning' };
    this.addEvent('StoreProvisioningStarted', {
      storeId: this.id.value,
      actorUserId,
    });
  }

  public markProvisioningFailed(actorUserId: string, error: string): void {
    this.assertTransition('failed');
    this.props = { ...this.props, status: 'failed' };
    this.addEvent('StoreProvisioningFailed', {
      storeId: this.id.value,
      actorUserId,
      error: error.trim(),
    });
  }

  public resumeProvisioning(actorUserId: string): void {
    if (this.props.status !== 'failed') {
      throw new InvalidStoreStatusTransitionError(this.props.status, 'provisioning');
    }
    this.props = { ...this.props, status: 'provisioning' };
    this.addEvent('StoreProvisioningStarted', {
      storeId: this.id.value,
      actorUserId,
      resumed: true,
    });
  }

  public completeProvisioning(actorUserId: string): void {
    if (this.props.status !== 'provisioning') {
      throw new InvalidStoreStatusTransitionError(this.props.status, 'active');
    }
    this.props = { ...this.props, status: 'active' };
    this.addEvent('StoreActivated', { storeId: this.id.value, actorUserId, provisioned: true });
  }

  public activate(actorUserId: string): void {
    this.assertTransition('active');
    this.props = { ...this.props, status: 'active' };
    this.addEvent('StoreActivated', { storeId: this.id.value, actorUserId });
  }

  public suspend(actorUserId: string, reason?: string): void {
    this.assertTransition('suspended');
    this.props = { ...this.props, status: 'suspended' };
    this.addEvent('StoreSuspended', {
      storeId: this.id.value,
      actorUserId,
      reason: reason?.trim() || null,
    });
  }

  public enableMaintenance(actorUserId: string, reason?: string): void {
    this.assertTransition('maintenance');
    this.props = { ...this.props, status: 'maintenance' };
    this.addEvent('StoreMaintenanceEnabled', {
      storeId: this.id.value,
      actorUserId,
      reason: reason?.trim() || null,
    });
  }

  public archive(actorUserId: string): void {
    if (!ALLOWED_TRANSITIONS[this.props.status].includes('archived')) {
      throw new InvalidStoreStatusTransitionError(this.props.status, 'archived');
    }
    this.props = { ...this.props, status: 'archived' };
    this.addEvent('StoreArchived', { storeId: this.id.value, actorUserId });
  }

  public close(actorUserId: string): void {
    this.assertTransition('closed');
    this.props = { ...this.props, status: 'closed' };
    this.addEvent('StoreClosed', { storeId: this.id.value, actorUserId });
  }

  public updateProfile(patch: {
    readonly displayName?: string;
    readonly description?: string | null;
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
    };
    this.addEvent('StoreProfileUpdated', { storeId: this.id.value });
  }

  public updateContact(patch: Partial<StoreContact>): void {
    this.assertMutable();
    this.props = {
      ...this.props,
      contact: {
        ...this.props.contact,
        ...patch,
      },
    };
    this.addEvent('StoreProfileUpdated', { storeId: this.id.value });
  }

  public updateAddress(patch: Partial<StoreAddress>): void {
    this.assertMutable();
    this.props = {
      ...this.props,
      address: {
        ...this.props.address,
        ...patch,
        countryCode: patch.countryCode
          ? patch.countryCode.toUpperCase()
          : this.props.address.countryCode,
      },
    };
    this.addEvent('StoreAddressUpdated', { storeId: this.id.value });
  }

  public updateOpeningHours(hours: readonly StoreOpeningHoursEntry[]): void {
    this.assertMutable();
    this.props = { ...this.props, openingHours: hours };
    this.addEvent('StoreAddressUpdated', { storeId: this.id.value });
  }

  public updateIdentity(patch: {
    readonly storeCode?: string;
    readonly storeType?: StoreType;
    readonly ownershipKind?: StoreOwnershipKind;
  }): void {
    this.assertMutable();
    if (patch.storeCode) {
      const code = normalizeStoreCode(patch.storeCode);
      if (code.length < 3) {
        throw new StoreDomainError('Store code must be at least 3 characters.');
      }
      this.props = { ...this.props, storeCode: code };
    }
    if (patch.storeType) {
      this.props = { ...this.props, storeType: patch.storeType };
    }
    if (patch.ownershipKind) {
      this.props = { ...this.props, ownershipKind: patch.ownershipKind };
    }
    this.addEvent('StoreProfileUpdated', { storeId: this.id.value });
  }

  public updateSettings(patch: Partial<StoreSettings>): void {
    this.assertMutable();
    this.props = {
      ...this.props,
      settings: {
        ...this.props.settings,
        ...patch,
        currencyCode: patch.currencyCode
          ? patch.currencyCode.toUpperCase()
          : this.props.settings.currencyCode,
      },
    };
    this.addEvent('StoreSettingsUpdated', { storeId: this.id.value });
  }

  public addStaff(userId: string, role: StoreStaffRole): void {
    this.assertMutable();
    if (this.props.staff.some((member) => member.userId === userId)) {
      throw new StoreStaffAlreadyExistsError();
    }

    this.props = {
      ...this.props,
      staff: [...this.props.staff, { userId, role, addedAt: new Date() }],
    };
    this.addEvent('StoreStaffAssigned', { storeId: this.id.value, userId, role });
  }

  public removeStaff(userId: string): void {
    this.assertMutable();
    const member = this.props.staff.find((entry) => entry.userId === userId);
    if (!member) {
      throw new StoreStaffNotFoundError();
    }

    if (member.role === 'STORE_MANAGER') {
      const managers = this.props.staff.filter((entry) => entry.role === 'STORE_MANAGER');
      if (managers.length <= 1) {
        throw new CannotRemoveLastManagerError();
      }
    }

    this.props = {
      ...this.props,
      staff: this.props.staff.filter((entry) => entry.userId !== userId),
    };
    this.addEvent('StoreStaffRemoved', { storeId: this.id.value, userId });
  }

  public hasStaff(userId: string): boolean {
    return this.props.staff.some((member) => member.userId === userId);
  }

  public isManager(userId: string): boolean {
    return this.props.staff.some(
      (member) => member.userId === userId && member.role === 'STORE_MANAGER',
    );
  }

  public assertOperable(): void {
    if (this.props.status !== 'active') {
      throw new StoreNotOperableError();
    }
  }

  private assertMutable(): void {
    if (this.props.status === 'closed' || this.props.status === 'archived') {
      throw new StoreClosedError();
    }
  }

  private assertTransition(target: StoreStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(target)) {
      throw new InvalidStoreStatusTransitionError(this.props.status, target);
    }
  }
}
