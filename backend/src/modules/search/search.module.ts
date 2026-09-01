import { Global, Module } from '@nestjs/common';
import { PRODUCT_SEARCH_INDEX } from '../../shared-kernel/application/ports/product-search-index.port';
import { SearchReindexHandler } from './application/commands/search-reindex.handler';
import { SearchProductsQueryHandler } from './application/queries/search-products.query-handler';
import { SEARCH_REINDEX_ENQUEUER } from './application/ports/search-reindex-enqueuer.port';
import { SearchReindexEnqueuerAdapter } from './infrastructure/bullmq/search-reindex-enqueuer.adapter';
import { MeilisearchProductSearchAdapter } from './infrastructure/meilisearch/meilisearch-product-search.adapter';
import { AdminSearchController } from './presentation/http/admin-search.controller';
import { SearchController } from './presentation/http/search.controller';

@Global()
@Module({
  controllers: [SearchController, AdminSearchController],
  providers: [
    MeilisearchProductSearchAdapter,
    SearchProductsQueryHandler,
    SearchReindexEnqueuerAdapter,
    SearchReindexHandler,
    {
      provide: PRODUCT_SEARCH_INDEX,
      useExisting: MeilisearchProductSearchAdapter,
    },
    {
      provide: SEARCH_REINDEX_ENQUEUER,
      useExisting: SearchReindexEnqueuerAdapter,
    },
  ],
  exports: [PRODUCT_SEARCH_INDEX],
})
export class SearchModule {}
