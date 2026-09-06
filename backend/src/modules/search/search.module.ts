import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PRODUCT_SEARCH_INDEX } from '../../shared-kernel/application/ports/product-search-index.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { SearchReindexHandler } from './application/commands/search-reindex.handler';
import { SearchProductsQueryHandler } from './application/queries/search-products.query-handler';
import { EnrichedSearchDtoService } from './application/services/enriched-search-dto.service';
import { SEARCH_SYNONYM_PORT } from './application/ports/search-synonym.port';
import { SearchSynonymService } from './infrastructure/services/search-synonym.service';
import { SEARCH_REINDEX_ENQUEUER } from './application/ports/search-reindex-enqueuer.port';
import { SearchReindexEnqueuerAdapter } from './infrastructure/bullmq/search-reindex-enqueuer.adapter';
import { SearchSynonymMapping } from './infrastructure/entities/search-synonym-mapping.entity';
import { SearchZeroResultQuery } from './infrastructure/entities/search-zero-result-query.entity';
import { MeilisearchProductSearchAdapter } from './infrastructure/meilisearch/meilisearch-product-search.adapter';
import { AdminSearchController } from './presentation/http/admin-search.controller';
import { SearchController } from './presentation/http/search.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([SearchSynonymMapping, SearchZeroResultQuery]),
  ],
  controllers: [SearchController, AdminSearchController],
  providers: [
    MeilisearchProductSearchAdapter,
    SearchProductsQueryHandler,
    SearchReindexEnqueuerAdapter,
    SearchReindexHandler,
    EnrichedSearchDtoService,
    SearchSynonymService,
    {
      provide: SEARCH_SYNONYM_PORT,
      useExisting: SearchSynonymService,
    },
    {
      provide: PRODUCT_SEARCH_INDEX,
      useExisting: MeilisearchProductSearchAdapter,
    },
    {
      provide: SEARCH_REINDEX_ENQUEUER,
      useExisting: SearchReindexEnqueuerAdapter,
    },
  ],
  exports: [
    PRODUCT_SEARCH_INDEX,
    EnrichedSearchDtoService,
    SEARCH_SYNONYM_PORT,
    SearchSynonymService,
  ],
})
export class SearchModule {}
