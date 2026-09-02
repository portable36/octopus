import { Inject, Injectable } from '@nestjs/common';
import {
  MEMBERSHIP_DIRECTORY,
  type MembershipDirectory,
} from '../../../../shared-kernel/application/ports/membership-directory.port';
import {
  USER_ROLE_ASSIGNER,
  type UserRoleAssigner,
} from '../../../../shared-kernel/application/ports/user-role-assigner.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { DuplicateStoreCodeError } from '../../domain/errors/store.errors';
import { Store } from '../../domain/aggregates/store.aggregate';
import type {
  StoreOnboardingDraftRecord,
  StoreWizardPayload,
  StoreWizardStep,
} from '../../domain/store-onboarding.types';
import {
  StoreAccessDeniedError,
  StoreDraftNotFoundError,
  StoreDraftValidationError,
  StoreDomainTakenError,
  StoreSlugTakenError,
  VendorNotActiveForStoreError,
  VendorNotFoundForStoreError,
} from '../errors/store.errors';
import {
  STORE_ONBOARDING_DRAFT_REPOSITORY,
  type StoreOnboardingDraftRepository,
} from '../ports/store-onboarding-draft-repository.interface';
import { STORE_PROVISIONING_REPOSITORY } from '../ports/store-provisioning-repository.interface';
import type { StoreProvisioningRepository } from '../ports/store-provisioning-repository.interface';
import { STORE_REPOSITORY, type StoreRepository } from '../ports/store-repository.interface';
import { StoreProvisioningOrchestrator } from '../provisioning/store-provisioning.orchestrator';
import { mergeWizardPayload, validateWizardPayload } from '../services/store-wizard-validation';

function isPlatformAdmin(roles: readonly string[]): boolean {
  return roles.includes('PLATFORM_ADMIN');
}

async function assertVendorAccess(
  vendors: VendorAccessPort,
  vendorId: string,
  actorUserId: string,
  actorRoles: readonly string[],
): Promise<void> {
  const vendor = await vendors.findById(vendorId);
  if (!vendor) {
    throw new VendorNotFoundForStoreError();
  }
  if (vendor.status !== 'active') {
    throw new VendorNotActiveForStoreError();
  }
  const isAdmin = isPlatformAdmin(actorRoles);
  const isOwner = vendor.ownerUserId === actorUserId;
  const isVendorStaff = vendor.staffUserIds.includes(actorUserId);
  if (!isAdmin && !isOwner && !isVendorStaff) {
    throw new StoreAccessDeniedError();
  }
}

@Injectable()
export class CreateStoreDraftHandler {
  constructor(
    @Inject(STORE_ONBOARDING_DRAFT_REPOSITORY)
    private readonly drafts: StoreOnboardingDraftRepository,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public async execute(input: {
    readonly vendorId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<StoreOnboardingDraftRecord> {
    await assertVendorAccess(this.vendors, input.vendorId, input.actorUserId, input.actorRoles);
    const now = new Date();
    const draft: StoreOnboardingDraftRecord = {
      id: UniqueID.create().value,
      vendorId: input.vendorId,
      actorUserId: input.actorUserId,
      storeId: null,
      currentStep: 1,
      payload: {},
      status: 'editing',
      createdAt: now,
      updatedAt: now,
    };
    await this.drafts.save(draft);
    return draft;
  }
}

@Injectable()
export class GetStoreDraftHandler {
  constructor(
    @Inject(STORE_ONBOARDING_DRAFT_REPOSITORY)
    private readonly drafts: StoreOnboardingDraftRepository,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public async execute(
    draftId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<StoreOnboardingDraftRecord> {
    const draft = await this.drafts.findById(draftId);
    if (!draft) {
      throw new StoreDraftNotFoundError();
    }
    await assertVendorAccess(this.vendors, draft.vendorId, actorUserId, actorRoles);
    return draft;
  }
}

@Injectable()
export class UpdateStoreDraftHandler {
  constructor(
    @Inject(STORE_ONBOARDING_DRAFT_REPOSITORY)
    private readonly drafts: StoreOnboardingDraftRepository,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public async execute(input: {
    readonly draftId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly currentStep?: StoreWizardStep;
    readonly payload?: StoreWizardPayload;
  }): Promise<StoreOnboardingDraftRecord> {
    const draft = await this.drafts.findById(input.draftId);
    if (!draft) {
      throw new StoreDraftNotFoundError();
    }
    await assertVendorAccess(this.vendors, draft.vendorId, input.actorUserId, input.actorRoles);
    if (draft.status !== 'editing') {
      throw new StoreDraftValidationError([{ field: 'status', message: 'Draft is not editable.' }]);
    }
    const updated: StoreOnboardingDraftRecord = {
      ...draft,
      currentStep: input.currentStep ?? draft.currentStep,
      payload: input.payload ? mergeWizardPayload(draft.payload, input.payload) : draft.payload,
      updatedAt: new Date(),
    };
    await this.drafts.save(updated);
    return updated;
  }
}

@Injectable()
export class ValidateStoreDraftHandler {
  constructor(
    @Inject(STORE_ONBOARDING_DRAFT_REPOSITORY)
    private readonly drafts: StoreOnboardingDraftRepository,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
    @Inject(STORE_PROVISIONING_REPOSITORY)
    private readonly provisioning: StoreProvisioningRepository,
  ) {}

  public async execute(
    draftId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<{ readonly valid: boolean; readonly issues: readonly { field: string; message: string }[] }> {
    const draft = await this.drafts.findById(draftId);
    if (!draft) {
      throw new StoreDraftNotFoundError();
    }
    await assertVendorAccess(this.vendors, draft.vendorId, actorUserId, actorRoles);
    const result = validateWizardPayload(draft.payload);
    const issues = [...result.issues];
    const hostname = draft.payload.domain?.hostname?.trim().toLowerCase();
    if (hostname && (await this.provisioning.existsHostname(hostname))) {
      issues.push({ field: 'domain.hostname', message: 'Hostname is already taken.' });
    }
    return { valid: issues.length === 0, issues };
  }
}

@Injectable()
export class SubmitStoreDraftHandler {
  constructor(
    @Inject(STORE_ONBOARDING_DRAFT_REPOSITORY)
    private readonly drafts: StoreOnboardingDraftRepository,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(STORE_PROVISIONING_REPOSITORY)
    private readonly provisioning: StoreProvisioningRepository,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
    @Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectory,
    @Inject(USER_ROLE_ASSIGNER) private readonly roleAssigner: UserRoleAssigner,
    private readonly orchestrator: StoreProvisioningOrchestrator,
  ) {}

  public async execute(
    draftId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<{ readonly draft: StoreOnboardingDraftRecord; readonly storeId: string }> {
    const draft = await this.drafts.findById(draftId);
    if (!draft) {
      throw new StoreDraftNotFoundError();
    }
    await assertVendorAccess(this.vendors, draft.vendorId, actorUserId, actorRoles);
    if (draft.status !== 'editing') {
      throw new StoreDraftValidationError([{ field: 'status', message: 'Draft already submitted.' }]);
    }

    const validation = validateWizardPayload(draft.payload);
    if (!validation.valid) {
      throw new StoreDraftValidationError(validation.issues);
    }

    const hostname = draft.payload.domain?.hostname?.trim().toLowerCase();
    if (hostname && (await this.provisioning.existsHostname(hostname))) {
      throw new StoreDomainTakenError();
    }

    const basic = draft.payload.basic!;
    const managerUserId = draft.payload.owner?.managerUserId ?? actorUserId;
    const store = Store.create({
      vendorId: draft.vendorId,
      displayName: basic.displayName!,
      managerUserId,
      ...(basic.storeCode ? { storeCode: basic.storeCode } : {}),
      ...(draft.payload.type?.storeType ? { storeType: draft.payload.type.storeType } : {}),
      ...(draft.payload.owner?.ownershipKind
        ? { ownershipKind: draft.payload.owner.ownershipKind }
        : {}),
      ...(basic.description !== undefined ? { description: basic.description } : {}),
      ...(basic.currencyCode ? { currencyCode: basic.currencyCode } : {}),
      ...(basic.timezone ? { timezone: basic.timezone } : {}),
      ...(basic.locale ? { locale: basic.locale } : {}),
      ...(draft.payload.location?.countryCode
        ? { countryCode: draft.payload.location.countryCode }
        : {}),
      ...(draft.payload.location?.addressLine1 !== undefined
        ? { addressLine1: draft.payload.location.addressLine1 }
        : {}),
      ...(draft.payload.location?.city !== undefined
        ? { city: draft.payload.location.city }
        : {}),
      ...(basic.phone !== undefined ? { phone: basic.phone } : {}),
      ...(basic.email !== undefined ? { email: basic.email } : {}),
      ...(basic.supportEmail !== undefined ? { supportEmail: basic.supportEmail } : {}),
    });

    if (await this.stores.existsByVendorAndSlug(draft.vendorId, store.profile.slug)) {
      throw new StoreSlugTakenError();
    }
    if (await this.stores.existsByVendorAndStoreCode(draft.vendorId, store.storeCode)) {
      throw new DuplicateStoreCodeError();
    }

    store.startProvisioning(actorUserId);
    await this.stores.save(store);
    await this.memberships.assignStoreMembership(managerUserId, draft.vendorId, store.id.value);
    await this.roleAssigner.ensureRoles(managerUserId, ['STORE_MANAGER']);

    const run = await this.provisioning.createRun(store.id.value);
    const submittedDraft: StoreOnboardingDraftRecord = {
      ...draft,
      storeId: store.id.value,
      status: 'submitted',
      updatedAt: new Date(),
    };
    await this.drafts.save(submittedDraft);

    await this.orchestrator.execute({
      storeId: store.id.value,
      runId: run.id,
      vendorId: draft.vendorId,
      actorUserId,
      payload: draft.payload,
    });

    const finalDraft =
      (await this.drafts.findById(draftId)) ??
      ({ ...submittedDraft, status: 'provisioned' as const });
    if (finalDraft.storeId) {
      const refreshedStore = await this.stores.findById(finalDraft.storeId);
      if (refreshedStore?.status === 'active') {
        await this.drafts.save({ ...finalDraft, status: 'provisioned', updatedAt: new Date() });
      }
    }

    return { draft: (await this.drafts.findById(draftId)) ?? submittedDraft, storeId: store.id.value };
  }
}
