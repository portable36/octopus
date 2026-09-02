import { authedRequest } from '@/lib/auth-api';

export type StoreWizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;

export type StoreWizardPayload = {
  basic?: {
    displayName?: string;
    storeCode?: string;
    description?: string | null;
    phone?: string | null;
    email?: string | null;
    supportEmail?: string | null;
    timezone?: string;
    locale?: string;
    currencyCode?: string;
  };
  owner?: { ownershipKind?: 'vendor_owned' | 'platform_owned' };
  type?: { storeType?: string };
  location?: {
    countryCode?: string;
    region?: string | null;
    city?: string | null;
    addressLine1?: string | null;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  domain?: { hostname?: string; kind?: 'subdomain' | 'custom' };
  catalog?: { mode?: string };
  warehouse?: { createNew?: boolean; code?: string; name?: string };
  pos?: { enabled?: boolean };
  payment?: { codEnabled?: boolean; acceptsOnlineOrders?: boolean };
  shipping?: { model?: string };
  tax?: { mode?: 'inclusive' | 'exclusive'; defaultRateBps?: number };
  branding?: { siteName?: string | null; tagline?: string | null; primaryColor?: string | null };
  seo?: { enabled?: boolean };
  staff?: { members?: readonly { userId: string; role: string }[] };
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
};

export type StoreOnboardingDraft = {
  id: string;
  vendorId: string;
  storeId: string | null;
  currentStep: StoreWizardStep;
  status: string;
  payload: StoreWizardPayload;
  createdAt: string;
  updatedAt: string;
};

export type ProvisioningStatus = {
  run: {
    id: string;
    storeId: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    lastError: string | null;
  };
  steps: readonly {
    stepName: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    error: string | null;
    retryCount: number;
  }[];
};

export const WIZARD_STEPS: { step: StoreWizardStep; label: string }[] = [
  { step: 1, label: 'Basic information' },
  { step: 2, label: 'Store owner' },
  { step: 3, label: 'Store type' },
  { step: 4, label: 'Location' },
  { step: 5, label: 'Domain' },
  { step: 6, label: 'Catalog' },
  { step: 7, label: 'Warehouse & inventory' },
  { step: 8, label: 'POS' },
  { step: 9, label: 'Payment' },
  { step: 10, label: 'Shipping' },
  { step: 11, label: 'Tax' },
  { step: 12, label: 'Branding & theme' },
  { step: 13, label: 'SEO' },
  { step: 14, label: 'Staff & permissions' },
  { step: 15, label: 'Notifications' },
  { step: 16, label: 'Review' },
  { step: 17, label: 'Create & activate' },
];

export function createStoreDraft(vendorId: string): Promise<StoreOnboardingDraft> {
  return authedRequest<StoreOnboardingDraft>('/stores/drafts', {
    method: 'POST',
    body: { vendorId },
  });
}

export function getStoreDraft(draftId: string): Promise<StoreOnboardingDraft> {
  return authedRequest<StoreOnboardingDraft>(`/stores/drafts/${encodeURIComponent(draftId)}`);
}

export function updateStoreDraft(
  draftId: string,
  input: { currentStep?: StoreWizardStep; payload?: StoreWizardPayload },
): Promise<StoreOnboardingDraft> {
  return authedRequest<StoreOnboardingDraft>(`/stores/drafts/${encodeURIComponent(draftId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function validateStoreDraft(
  draftId: string,
): Promise<{ valid: boolean; errors: readonly string[] }> {
  return authedRequest<{ valid: boolean; errors: readonly string[] }>(
    `/stores/drafts/${encodeURIComponent(draftId)}/validate`,
    { method: 'POST' },
  );
}

export function submitStoreDraft(
  draftId: string,
): Promise<{ storeId: string; draft: StoreOnboardingDraft }> {
  return authedRequest<{ storeId: string; draft: StoreOnboardingDraft }>(
    `/stores/drafts/${encodeURIComponent(draftId)}/submit`,
    { method: 'POST' },
  );
}

export function getStoreProvisioningStatus(storeId: string): Promise<ProvisioningStatus> {
  return authedRequest<ProvisioningStatus>(
    `/stores/${encodeURIComponent(storeId)}/provisioning`,
  );
}

export function retryStoreProvisioning(storeId: string): Promise<{ ok: boolean }> {
  return authedRequest<{ ok: boolean }>(
    `/stores/${encodeURIComponent(storeId)}/provisioning/retry`,
    { method: 'POST' },
  );
}

export function mergePayload(
  current: StoreWizardPayload,
  section: keyof StoreWizardPayload,
  data: StoreWizardPayload[keyof StoreWizardPayload],
): StoreWizardPayload {
  return { ...current, [section]: { ...current[section], ...data } };
}
