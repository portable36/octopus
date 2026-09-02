import { createHash } from 'node:crypto';

/** Deterministic UUID for CMS slug override lookups (no CMS table yet). */
export function cmsSlugToEntityId(slug: string): string {
  const hash = createHash('sha256').update(`cms:${slug}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

export type ParsedSeoPath =
  | { readonly kind: 'product'; readonly productId: string }
  | { readonly kind: 'category'; readonly slug: string }
  | { readonly kind: 'cms'; readonly slug: string; readonly entityId: string };

export function parsePublicSeoPath(path: string): ParsedSeoPath | null {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const productMatch = /^\/products\/([^/]+)$/.exec(normalized);
  if (productMatch?.[1]) {
    return { kind: 'product', productId: productMatch[1] };
  }
  const categoryMatch = /^\/categories\/([^/]+)$/.exec(normalized);
  if (categoryMatch?.[1]) {
    return { kind: 'category', slug: categoryMatch[1] };
  }
  const cmsMatch = /^\/pages\/([^/]+)$/.exec(normalized);
  if (cmsMatch?.[1]) {
    return {
      kind: 'cms',
      slug: cmsMatch[1],
      entityId: cmsSlugToEntityId(cmsMatch[1]),
    };
  }
  return null;
}
