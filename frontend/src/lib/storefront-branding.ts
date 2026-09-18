import { getPublicAppName } from '@/lib/env';
import { getPublicMediaUrl } from '@/lib/media-public';
import {
  fetchStorefrontConfig,
  type FetchStorefrontConfigOptions,
  type StorefrontPublicConfig,
} from '@/lib/storefront-config-api';

export type ResolvedStorefrontBranding = {
  readonly siteName: string;
  readonly tagline: string | null;
  readonly logoUrl: string | null;
  readonly faviconUrl: string | null;
  readonly logoMediaId: string | null;
  readonly faviconMediaId: string | null;
};

export function pickSiteName(
  brandingSiteName: string | null | undefined,
  fallback: string = getPublicAppName(),
): string {
  const name = brandingSiteName?.trim();
  return name && name.length > 0 ? name : fallback;
}

/** Letter mark used when no logo image is configured (e.g. "O."). */
export function brandMarkLetter(siteName: string): string {
  const ch = siteName.trim().charAt(0);
  return ch ? `${ch.toUpperCase()}.` : 'O.';
}

export async function resolveStorefrontBranding(
  options: FetchStorefrontConfigOptions = {},
): Promise<ResolvedStorefrontBranding> {
  let config: StorefrontPublicConfig | null = null;
  try {
    config = await fetchStorefrontConfig(options);
  } catch {
    config = null;
  }

  const branding = config?.branding;
  const siteName = pickSiteName(branding?.siteName);
  const tagline = branding?.tagline?.trim() || null;
  const logoMediaId = branding?.logoMediaId?.trim() || null;
  const faviconMediaId = branding?.faviconMediaId?.trim() || null;

  const [logo, favicon] = await Promise.all([
    logoMediaId ? getPublicMediaUrl(logoMediaId) : Promise.resolve(null),
    faviconMediaId ? getPublicMediaUrl(faviconMediaId) : Promise.resolve(null),
  ]);

  return {
    siteName,
    tagline,
    logoUrl: logo?.url ?? null,
    faviconUrl: favicon?.url ?? null,
    logoMediaId,
    faviconMediaId,
  };
}
