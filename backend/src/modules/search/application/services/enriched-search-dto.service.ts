import { Injectable } from '@nestjs/common';
import type { CatalogOfferSearchSourceDto } from '../../../../shared-kernel/application/ports/catalog-offer-search-source.port';
import { buildSemanticSearchText } from '../../domain/services/build-semantic-search-text';

@Injectable()
export class EnrichedSearchDtoService {
  /** Build the semantic text payload block from a catalog search projection. */
  public buildSemanticBlock(source: CatalogOfferSearchSourceDto): string {
    return buildSemanticSearchText({
      name: source.name,
      variantName: source.variantName ?? null,
      categoryNames: source.categoryNames ?? [],
      shortDescription: source.shortDescription ?? null,
      productAttributes: source.productAttributes ?? [],
      variantAttributes: source.variantAttributes ?? [],
      reviewTexts: source.reviewTexts ?? [],
    });
  }
}
