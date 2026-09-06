import { Inject, Injectable } from '@nestjs/common';
import { embedInternalLinks, type InternalLinkTarget } from '../../domain/embed-internal-links';
import {
  CATALOG_INTERNAL_LINK_SOURCE,
  type CatalogInternalLinkSourcePort,
} from '../ports/catalog-internal-link-source.port';

const MAX_INTERNAL_LINKS = 3;

@Injectable()
export class SemanticSeoService {
  private targetsCache: {
    readonly expiresAt: number;
    readonly targets: readonly InternalLinkTarget[];
  } | null = null;

  constructor(
    @Inject(CATALOG_INTERNAL_LINK_SOURCE)
    private readonly linkSource: CatalogInternalLinkSourcePort,
  ) {}

  /**
   * Scan a product or category description and embed contextual internal links
   * using exact-match anchor text (max 3 per description).
   */
  public async enrichDescriptionWithInternalLinks(
    description: string | null | undefined,
  ): Promise<string | null> {
    if (!description?.trim()) {
      return description ?? null;
    }
    const targets = await this.loadTargets();
    return embedInternalLinks(description, targets, MAX_INTERNAL_LINKS);
  }

  private async loadTargets(): Promise<readonly InternalLinkTarget[]> {
    const now = Date.now();
    if (this.targetsCache && this.targetsCache.expiresAt > now) {
      return this.targetsCache.targets;
    }
    const targets = await this.linkSource.listLinkTargets();
    this.targetsCache = { targets, expiresAt: now + 5 * 60 * 1000 };
    return targets;
  }
}
