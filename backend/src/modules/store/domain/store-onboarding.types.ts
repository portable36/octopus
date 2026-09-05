import type { DayOfWeek, StoreOwnershipKind, StoreStaffRole, StoreType } from './store.types';

export type StoreOnboardingDraftStatus = 'editing' | 'submitted' | 'provisioned' | 'cancelled';

export type StoreWizardStep =
  1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;

export type ProvisioningRunStatus = 'running' | 'completed' | 'failed';

export type ProvisioningStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export const PROVISIONING_STEP_NAMES = [
  'StoreIdentityFinalized',
  'DefaultSettingsProvisioned',
  'CatalogConfigured',
  'WarehouseProvisioned',
  'PosProvisioned',
  'ProvisioningCompleted',
] as const;

export type ProvisioningStepName = (typeof PROVISIONING_STEP_NAMES)[number];

export interface StoreWizardBasicSection {
  readonly displayName?: string;
  readonly storeCode?: string;
  readonly description?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly supportEmail?: string | null;
  readonly timezone?: string;
  readonly locale?: string;
  readonly currencyCode?: string;
}

export interface StoreWizardOwnerSection {
  readonly ownershipKind?: StoreOwnershipKind;
  readonly managerUserId?: string;
}

export interface StoreWizardTypeSection {
  readonly storeType?: StoreType;
}

export interface StoreWizardLocationSection {
  readonly countryCode?: string;
  readonly region?: string | null;
  readonly city?: string | null;
  readonly addressLine1?: string | null;
  readonly addressLine2?: string | null;
  readonly postalCode?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly openingHours?: readonly {
    readonly day: DayOfWeek;
    readonly open: string | null;
    readonly close: string | null;
    readonly closed: boolean;
  }[];
}

export interface StoreWizardDomainSection {
  readonly hostname?: string;
  readonly kind?: 'subdomain' | 'custom';
}

export interface StoreWizardCatalogSection {
  readonly mode?: 'empty' | 'import' | 'copy';
}

export interface StoreWizardWarehouseSection {
  readonly createNew?: boolean;
  readonly code?: string;
  readonly name?: string;
  readonly addressLine?: string | null;
}

export interface StoreWizardPosSection {
  readonly enabled?: boolean;
}

export interface StoreWizardPaymentSection {
  readonly codEnabled?: boolean;
  readonly acceptsOnlineOrders?: boolean;
}

export interface StoreWizardShippingSection {
  readonly model?: 'store_managed' | 'platform_managed' | 'vendor_managed' | 'hybrid';
}

export interface StoreWizardTaxSection {
  readonly mode?: 'inclusive' | 'exclusive';
  readonly defaultRateBps?: number;
}

export interface StoreWizardBrandingSection {
  readonly siteName?: string | null;
  readonly tagline?: string | null;
  readonly primaryColor?: string | null;
  readonly logoMediaId?: string | null;
}

export interface StoreWizardSeoSection {
  readonly metaTitle?: string | null;
  readonly metaDescription?: string | null;
}

export interface StoreWizardStaffSection {
  readonly members?: readonly {
    readonly userId: string;
    readonly role: StoreStaffRole;
  }[];
}

export interface StoreWizardNotificationsSection {
  readonly emailEnabled?: boolean;
  readonly smsEnabled?: boolean;
}

export interface StoreWizardPayload {
  readonly basic?: StoreWizardBasicSection;
  readonly owner?: StoreWizardOwnerSection;
  readonly type?: StoreWizardTypeSection;
  readonly location?: StoreWizardLocationSection;
  readonly domain?: StoreWizardDomainSection;
  readonly catalog?: StoreWizardCatalogSection;
  readonly warehouse?: StoreWizardWarehouseSection;
  readonly pos?: StoreWizardPosSection;
  readonly payment?: StoreWizardPaymentSection;
  readonly shipping?: StoreWizardShippingSection;
  readonly tax?: StoreWizardTaxSection;
  readonly branding?: StoreWizardBrandingSection;
  readonly seo?: StoreWizardSeoSection;
  readonly staff?: StoreWizardStaffSection;
  readonly notifications?: StoreWizardNotificationsSection;
}

export interface StoreOnboardingDraftRecord {
  readonly id: string;
  readonly vendorId: string;
  readonly actorUserId: string;
  readonly storeId: string | null;
  readonly currentStep: StoreWizardStep;
  readonly payload: StoreWizardPayload;
  readonly status: StoreOnboardingDraftStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProvisioningRunRecord {
  readonly id: string;
  readonly storeId: string;
  readonly status: ProvisioningRunStatus;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly lastError: string | null;
}

export interface ProvisioningStepRecord {
  readonly id: string;
  readonly runId: string;
  readonly stepName: ProvisioningStepName;
  readonly status: ProvisioningStepStatus;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly error: string | null;
  readonly retryCount: number;
}

export const EMPTY_WIZARD_PAYLOAD: StoreWizardPayload = {};
