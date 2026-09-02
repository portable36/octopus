import { Injectable } from '@nestjs/common';
import { embedInternalLinks } from '../../domain/embed-internal-links';
import { CatalogInternalLinkSourceAdapter } from '../../infrastructure/access/catalog-internal-link-source.adapter';

const MAX_INTERNAL_LINKS = 3;

@Injectable()
export class SemanticSeoService {
  private targetsCache: {
    readonly expiresAt: number;
    readonly targets: Awaited<ReturnType<CatalogInternalLinkSourceAdapter['listLinkTargets']>>;
  } | null = null;

  constructor(private readonly linkSource: CatalogInternalLinkSourceAdapter) {}

  /**
   * Scan a product or category description and embed contextual internal links
   * using exact-match anchor text (max 3 per description).
   */
  public async enrichDescriptionWithInternalLinks(description: string | null | undefined): Promise<string | null> {
    if (!description?.trim()) {
      return description ?? null;
    }
    const targets = await this.loadTargets();
    return embedInternalLinks(description, targets, MAX_INTERNAL_LINKS);
  }

  private async loadTargets(): Promise<Awaited<ReturnType<CatalogInternalLinkSourceAdapter['listLinkTargets']>>> {
    const now = Date.now();
    if (this.targetsCache && this.targetsCache.expiresAt > now) {
      return this.targetsCache.targets;
    }
    const targets = await this.linkSource.listLinkTargets();
    this.targetsCache = { targets, expiresAt: now + 5 * 60 * 1000 };
    return targets;
  }
}
