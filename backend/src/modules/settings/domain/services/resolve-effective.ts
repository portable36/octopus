import {
  DEFAULT_BRANDING_SETTINGS,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_MARKETING_SETTINGS,
  type BrandingSettings,
  type ConfigurationDocumentRecord,
  type ConfigurationKey,
  type ConfigurationScope,
  type GeneralSettings,
  type MarketingSettings,
} from '../settings.types';

function matchesScope(doc: ConfigurationDocumentRecord, scope: ConfigurationScope): boolean {
  if (doc.scopeKind !== scope.kind) {
    return false;
  }
  if (scope.kind === 'platform') {
    return doc.vendorId === null && doc.storeId === null;
  }
  if (scope.kind === 'vendor') {
    return doc.vendorId === scope.vendorId && doc.storeId === null;
  }
  return doc.vendorId === scope.vendorId && doc.storeId === scope.storeId;
}

function findPayload(
  documents: readonly ConfigurationDocumentRecord[],
  key: ConfigurationKey,
  scope: ConfigurationScope,
): Record<string, unknown> | null {
  const match = documents.find((doc) => doc.key === key && matchesScope(doc, scope));
  return match?.payload ?? null;
}

export function resolveEffectiveGeneral(
  documents: readonly ConfigurationDocumentRecord[],
  target: ConfigurationScope,
): GeneralSettings {
  const platform = findPayload(documents, 'general', { kind: 'platform' });
  const vendor =
    target.kind === 'vendor' || target.kind === 'store'
      ? findPayload(documents, 'general', { kind: 'vendor', vendorId: target.vendorId })
      : null;
  const store =
    target.kind === 'store'
      ? findPayload(documents, 'general', {
          kind: 'store',
          vendorId: target.vendorId,
          storeId: target.storeId,
        })
      : null;

  return {
    ...DEFAULT_GENERAL_SETTINGS,
    ...(platform as Partial<GeneralSettings> | null),
    ...(vendor as Partial<GeneralSettings> | null),
    ...(store as Partial<GeneralSettings> | null),
    schemaVersion: 1,
  };
}

export function resolveEffectiveBranding(
  documents: readonly ConfigurationDocumentRecord[],
  target: ConfigurationScope,
): BrandingSettings {
  const platform = findPayload(documents, 'branding', { kind: 'platform' });
  const vendor =
    target.kind === 'vendor' || target.kind === 'store'
      ? findPayload(documents, 'branding', { kind: 'vendor', vendorId: target.vendorId })
      : null;
  const store =
    target.kind === 'store'
      ? findPayload(documents, 'branding', {
          kind: 'store',
          vendorId: target.vendorId,
          storeId: target.storeId,
        })
      : null;

  return {
    ...DEFAULT_BRANDING_SETTINGS,
    ...(platform as Partial<BrandingSettings> | null),
    ...(vendor as Partial<BrandingSettings> | null),
    ...(store as Partial<BrandingSettings> | null),
    schemaVersion: 1,
  };
}

export function resolveEffectiveMarketing(
  documents: readonly ConfigurationDocumentRecord[],
  target: ConfigurationScope,
): MarketingSettings {
  const platform = findPayload(documents, 'marketing', { kind: 'platform' });
  const vendor =
    target.kind === 'vendor' || target.kind === 'store'
      ? findPayload(documents, 'marketing', { kind: 'vendor', vendorId: target.vendorId })
      : null;
  const store =
    target.kind === 'store'
      ? findPayload(documents, 'marketing', {
          kind: 'store',
          vendorId: target.vendorId,
          storeId: target.storeId,
        })
      : null;

  return {
    ...DEFAULT_MARKETING_SETTINGS,
    ...(platform as Partial<MarketingSettings> | null),
    ...(vendor as Partial<MarketingSettings> | null),
    ...(store as Partial<MarketingSettings> | null),
    schemaVersion: 1,
  };
}
