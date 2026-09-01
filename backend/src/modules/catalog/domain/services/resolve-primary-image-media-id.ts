import type { CatalogMediaReference } from '../catalog.types';

/** Pick primary product image for search/PLP; falls back to first image ref. */
export function resolvePrimaryImageMediaId(
  media: readonly CatalogMediaReference[] | unknown,
): string | null {
  if (!Array.isArray(media) || media.length === 0) {
    return null;
  }
  const items = media as readonly CatalogMediaReference[];
  const primary = items.find((item) => item.isPrimary && item.mediaType === 'IMAGE');
  if (primary?.mediaId) {
    return primary.mediaId;
  }
  const firstImage = items.find((item) => item.mediaType === 'IMAGE' && item.mediaId);
  return firstImage?.mediaId ?? null;
}
