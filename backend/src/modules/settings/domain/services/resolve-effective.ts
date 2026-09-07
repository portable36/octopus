import {
  DEFAULT_BRANDING_SETTINGS,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_MARKETING_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  type BrandingSettings,
  type ConfigurationDocumentRecord,
  type ConfigurationKey,
  type ConfigurationScope,
  type GeneralSettings,
  type MarketingSettings,
  type ThemeSettings,
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

export function resolveEffectiveTheme(
  documents: readonly ConfigurationDocumentRecord[],
  target: ConfigurationScope,
): ThemeSettings {
  const platform = findPayload(documents, 'theme', {
    kind: 'platform',
  }) as Partial<ThemeSettings> | null;
  const vendor =
    target.kind === 'vendor' || target.kind === 'store'
      ? (findPayload(documents, 'theme', {
          kind: 'vendor',
          vendorId: target.vendorId,
        }) as Partial<ThemeSettings> | null)
      : null;
  const store =
    target.kind === 'store'
      ? (findPayload(documents, 'theme', {
          kind: 'store',
          vendorId: target.vendorId,
          storeId: target.storeId,
        }) as Partial<ThemeSettings> | null)
      : null;

  return {
    schemaVersion: 1,
    announcementBar: {
      ...DEFAULT_THEME_SETTINGS.announcementBar,
      ...(platform?.announcementBar ?? {}),
      ...(vendor?.announcementBar ?? {}),
      ...(store?.announcementBar ?? {}),
    },
    colors: {
      ...DEFAULT_THEME_SETTINGS.colors,
      ...(platform?.colors ?? {}),
      ...(vendor?.colors ?? {}),
      ...(store?.colors ?? {}),
    },
    heroBanner: {
      ...DEFAULT_THEME_SETTINGS.heroBanner,
      ...(platform?.heroBanner ?? {}),
      ...(vendor?.heroBanner ?? {}),
      ...(store?.heroBanner ?? {}),
    },
    promoBanner: {
      ...DEFAULT_THEME_SETTINGS.promoBanner,
      ...(platform?.promoBanner ?? {}),
      ...(vendor?.promoBanner ?? {}),
      ...(store?.promoBanner ?? {}),
    },
    header: {
      ...DEFAULT_THEME_SETTINGS.header,
      ...(platform?.header ?? {}),
      ...(vendor?.header ?? {}),
      ...(store?.header ?? {}),
    },
    footer: {
      ...DEFAULT_THEME_SETTINGS.footer,
      ...(platform?.footer ?? {}),
      ...(vendor?.footer ?? {}),
      ...(store?.footer ?? {}),
    },
  };
}
