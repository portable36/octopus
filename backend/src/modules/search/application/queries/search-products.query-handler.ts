import { Inject, Injectable } from '@nestjs/common';
import {
  MEDIA_ASSET_ACCESS,
  type MediaAssetAccessPort,
} from '../../../../shared-kernel/application/ports/media-asset-access.port';
import type {
  OfferSearchDocumentDto,
  SearchProductsQueryDto,
  SearchProductsResultDto,
  SearchProductHitDto,
} from '../../../../shared-kernel/application/ports/product-search-index.port';
import {
  PRODUCT_SEARCH_INDEX,
  type ProductSearchIndexPort,
} from '../ports/product-search-index.port';

export type EnrichedSearchProductsResultDto = Omit<SearchProductsResultDto, 'hits'> & {
  readonly hits: readonly SearchProductHitDto[];
};

@Injectable()
export class SearchProductsQueryHandler {
  constructor(
    @Inject(PRODUCT_SEARCH_INDEX) private readonly searchIndex: ProductSearchIndexPort,
    @Inject(MEDIA_ASSET_ACCESS) private readonly mediaAccess: MediaAssetAccessPort,
  ) {}

  public async execute(query: SearchProductsQueryDto): Promise<EnrichedSearchProductsResultDto> {
    const result = await this.searchIndex.search(query);
    const hits = await this.enrichHits(result.hits);
    return { ...result, hits };
  }

  private async enrichHits(
    hits: readonly OfferSearchDocumentDto[],
  ): Promise<readonly SearchProductHitDto[]> {
    const mediaIds = [
      ...new Set(
        hits
          .map((hit) => hit.primaryImageMediaId)
          .filter((mediaId): mediaId is string => Boolean(mediaId)),
      ),
    ];
    const urlByMediaId = new Map<string, string | null>();
    await Promise.all(
      mediaIds.map(async (mediaId) => {
        const resolved = await this.mediaAccess.resolvePublicImageUrl(mediaId);
        urlByMediaId.set(mediaId, resolved?.url ?? null);
      }),
    );
    return hits.map((hit) => ({
      ...hit,
      primaryImageUrl: hit.primaryImageMediaId
        ? (urlByMediaId.get(hit.primaryImageMediaId) ?? null)
        : null,
    }));
  }
}
