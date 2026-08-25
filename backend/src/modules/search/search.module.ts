import { Module } from '@nestjs/common';
import { PRODUCT_SEARCH_INDEX } from './application/ports/product-search-index.port';
import { MeilisearchProductSearchAdapter } from './infrastructure/meilisearch/meilisearch-product-search.adapter';
import { SearchController } from './presentation/http/search.controller';

@Module({
  controllers: [SearchController],
  providers: [
    MeilisearchProductSearchAdapter,
    {
      provide: PRODUCT_SEARCH_INDEX,
      useExisting: MeilisearchProductSearchAdapter,
    },
  ],
  exports: [PRODUCT_SEARCH_INDEX],
})
export class SearchModule {}
