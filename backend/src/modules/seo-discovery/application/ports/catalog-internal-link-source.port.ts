import type { InternalLinkTarget } from '../../domain/embed-internal-links';

export const CATALOG_INTERNAL_LINK_SOURCE = Symbol('CATALOG_INTERNAL_LINK_SOURCE');

export interface CatalogInternalLinkSourcePort {
  listLinkTargets(limit?: number): Promise<readonly InternalLinkTarget[]>;
}
