import type { StoreWizardPayload } from '../../domain/store-onboarding.types';

export function mergeWizardPayload(
  current: StoreWizardPayload,
  patch: StoreWizardPayload,
): StoreWizardPayload {
  return {
    ...(current.basic || patch.basic
      ? { basic: { ...current.basic, ...patch.basic } }
      : {}),
    ...(current.owner || patch.owner
      ? { owner: { ...current.owner, ...patch.owner } }
      : {}),
    ...(current.type || patch.type ? { type: { ...current.type, ...patch.type } } : {}),
    ...(current.location || patch.location
      ? { location: { ...current.location, ...patch.location } }
      : {}),
    ...(current.domain || patch.domain
      ? { domain: { ...current.domain, ...patch.domain } }
      : {}),
    ...(current.catalog || patch.catalog
      ? { catalog: { ...current.catalog, ...patch.catalog } }
      : {}),
    ...(current.warehouse || patch.warehouse
      ? { warehouse: { ...current.warehouse, ...patch.warehouse } }
      : {}),
    ...(current.pos || patch.pos ? { pos: { ...current.pos, ...patch.pos } } : {}),
    ...(current.payment || patch.payment
      ? { payment: { ...current.payment, ...patch.payment } }
      : {}),
    ...(current.shipping || patch.shipping
      ? { shipping: { ...current.shipping, ...patch.shipping } }
      : {}),
    ...(current.tax || patch.tax ? { tax: { ...current.tax, ...patch.tax } } : {}),
    ...(current.branding || patch.branding
      ? { branding: { ...current.branding, ...patch.branding } }
      : {}),
    ...(current.seo || patch.seo ? { seo: { ...current.seo, ...patch.seo } } : {}),
    ...(current.staff || patch.staff ? { staff: { ...current.staff, ...patch.staff } } : {}),
    ...(current.notifications || patch.notifications
      ? { notifications: { ...current.notifications, ...patch.notifications } }
      : {}),
  };
}

export function validateWizardPayload(payload: StoreWizardPayload): {
  readonly valid: boolean;
  readonly issues: readonly { readonly field: string; readonly message: string }[];
} {
  const issues: { field: string; message: string }[] = [];
  const displayName = payload.basic?.displayName?.trim();
  if (!displayName || displayName.length < 2) {
    issues.push({ field: 'basic.displayName', message: 'Display name is required (min 2 chars).' });
  }
  const storeCode = payload.basic?.storeCode?.trim();
  if (!storeCode || storeCode.length < 3) {
    issues.push({ field: 'basic.storeCode', message: 'Store code is required (min 3 chars).' });
  }
  if (!payload.type?.storeType) {
    issues.push({ field: 'type.storeType', message: 'Store type is required.' });
  }
  if (!payload.owner?.ownershipKind) {
    issues.push({ field: 'owner.ownershipKind', message: 'Ownership kind is required.' });
  }
  return { valid: issues.length === 0, issues };
}
