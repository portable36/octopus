import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import {
  CreateProductHandler,
  GetProductHandler,
  ProductLifecycleHandler,
} from './application/commands/product.handlers';
import {
  CreateVariantHandler,
  VariantLifecycleHandler,
} from './application/commands/variant.handlers';
import {
  CreateCategoryHandler,
  ListCategoriesHandler,
  UpdateCategoryHandler,
} from './application/commands/category.handlers';
import {
  CreateStoreOfferHandler,
  StoreOfferLifecycleHandler,
} from './application/commands/store-offer.handlers';
import { PRODUCT_REPOSITORY } from './application/ports/product-repository.interface';
import { VARIANT_REPOSITORY } from './application/ports/variant-repository.interface';
import { CATEGORY_REPOSITORY } from './application/ports/category-repository.interface';
import { STORE_OFFER_REPOSITORY } from './application/ports/store-offer-repository.interface';
import { CatalogAuthorizationService } from './application/services/catalog-authorization.service';
import { ProductOrmEntity } from './infrastructure/persistence/product.orm-entity';
import { VariantOrmEntity } from './infrastructure/persistence/variant.orm-entity';
import { CategoryOrmEntity } from './infrastructure/persistence/category.orm-entity';
import { StoreOfferOrmEntity } from './infrastructure/persistence/store-offer.orm-entity';
import { CatalogOutboxOrmEntity } from './infrastructure/persistence/catalog-outbox.orm-entity';
import { ProductRepositoryAdapter } from './infrastructure/persistence/product.repository.adapter';
import { VariantRepositoryAdapter } from './infrastructure/persistence/variant.repository.adapter';
import { CategoryRepositoryAdapter } from './infrastructure/persistence/category.repository.adapter';
import { StoreOfferRepositoryAdapter } from './infrastructure/persistence/store-offer.repository.adapter';
import { CatalogController } from './presentation/http/catalog.controller';
import { PublicCatalogController } from './presentation/http/public-catalog.controller';
import { PublicCatalogQueryHandler } from './application/queries/public-catalog.query-handler';
import { CatalogVariantAccessAdapter } from './infrastructure/access/catalog-variant-access.adapter';
import { CatalogStoreOfferAccessAdapter } from './infrastructure/access/catalog-store-offer-access.adapter';
import { CATALOG_VARIANT_ACCESS } from '../../shared-kernel/application/ports/catalog-variant-access.port';
import { CATALOG_STORE_OFFER_ACCESS } from '../../shared-kernel/application/ports/catalog-store-offer-access.port';
import { CATALOG_OFFER_SEARCH_SOURCE } from '../../shared-kernel/application/ports/catalog-offer-search-source.port';
import { CatalogOfferSearchSourceAdapter } from './infrastructure/access/catalog-offer-search-source.adapter';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([
      ProductOrmEntity,
      VariantOrmEntity,
      CategoryOrmEntity,
      StoreOfferOrmEntity,
      CatalogOutboxOrmEntity,
    ]),
  ],
  controllers: [CatalogController, PublicCatalogController],
  providers: [
    CatalogAuthorizationService,
    CreateProductHandler,
    ProductLifecycleHandler,
    GetProductHandler,
    CreateVariantHandler,
    VariantLifecycleHandler,
    CreateCategoryHandler,
    UpdateCategoryHandler,
    ListCategoriesHandler,
    CreateStoreOfferHandler,
    StoreOfferLifecycleHandler,
    PublicCatalogQueryHandler,
    { provide: PRODUCT_REPOSITORY, useClass: ProductRepositoryAdapter },
    { provide: VARIANT_REPOSITORY, useClass: VariantRepositoryAdapter },
    { provide: CATEGORY_REPOSITORY, useClass: CategoryRepositoryAdapter },
    { provide: STORE_OFFER_REPOSITORY, useClass: StoreOfferRepositoryAdapter },
    { provide: CATALOG_VARIANT_ACCESS, useClass: CatalogVariantAccessAdapter },
    { provide: CATALOG_STORE_OFFER_ACCESS, useClass: CatalogStoreOfferAccessAdapter },
    { provide: CATALOG_OFFER_SEARCH_SOURCE, useClass: CatalogOfferSearchSourceAdapter },
  ],
  exports: [
    PRODUCT_REPOSITORY,
    VARIANT_REPOSITORY,
    CATEGORY_REPOSITORY,
    STORE_OFFER_REPOSITORY,
    CATALOG_VARIANT_ACCESS,
    CATALOG_STORE_OFFER_ACCESS,
    CATALOG_OFFER_SEARCH_SOURCE,
  ],
})
export class CatalogModule {}
