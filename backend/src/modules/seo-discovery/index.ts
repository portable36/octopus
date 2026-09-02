/**
 * Public facade for the seo-discovery bounded context.
 * Other modules must depend on this entry point — not internal layers.
 */

import type { RedirectRule, SEOMetadata, StructuredData } from './domain/seo.types';

export type {
  OpenGraphMetadata,
  RedirectRule,
  RedirectStatusCode,
  RobotsDirective,
  SEOMetadata,
  StructuredData,
} from './domain/seo.types';

export { SeoDiscoveryFacade } from './application/services/seo-discovery.facade';
export { SeoDiscoveryModule } from './seo-discovery.module';

/** Resolve SEO metadata for a public entity (stub — SEO-01). */
export function resolveSeoMetadata(_input: {
  readonly entityType: string;
  readonly entityId: string;
}): Promise<SEOMetadata | null> {
  void _input;
  return Promise.resolve(null);
}

/** Build JSON-LD structured data for a public entity (stub — SEO-05). */
export function buildStructuredData(_input: {
  readonly entityType: string;
  readonly entityId: string;
}): Promise<readonly StructuredData[]> {
  void _input;
  return Promise.resolve([]);
}

/** Look up an active redirect for a path (stub — SEO-02). */
export function findRedirectRule(_sourceUrl: string): Promise<RedirectRule | null> {
  void _sourceUrl;
  return Promise.resolve(null);
}
