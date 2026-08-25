import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_OFFER_SEARCH_SOURCE,
  type CatalogOfferSearchSourcePort,
} from '../../../../shared-kernel/application/ports/catalog-offer-search-source.port';
import {
  SEARCH_REINDEX_ENQUEUER,
  type SearchReindexEnqueueResult,
  type SearchReindexEnqueuerPort,
} from '../ports/search-reindex-enqueuer.port';

const BATCH_SIZE = 50;

@Injectable()
export class SearchReindexHandler {
  constructor(
    @Inject(CATALOG_OFFER_SEARCH_SOURCE) private readonly catalog: CatalogOfferSearchSourcePort,
    @Inject(SEARCH_REINDEX_ENQUEUER) private readonly enqueuer: SearchReindexEnqueuerPort,
  ) {}

  public async enqueueFullReindex(
    actorRoles: readonly string[],
  ): Promise<SearchReindexEnqueueResult> {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      throw new ForbiddenException({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        detail: 'Platform admin required to reindex search.',
        code: 'SEARCH_REINDEX_FORBIDDEN',
      });
    }

    const batches: string[][] = [];
    let afterId: string | null = null;
    for (;;) {
      const page = await this.catalog.listOfferIdsPage(afterId, BATCH_SIZE);
      if (page.offerIds.length === 0) {
        break;
      }
      batches.push([...page.offerIds]);
      afterId = page.nextAfterId;
      if (!afterId) {
        break;
      }
    }

    return this.enqueuer.enqueueOfferBatches(batches);
  }
}
