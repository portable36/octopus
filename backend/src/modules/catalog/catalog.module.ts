import { Module } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from './application/ports/product-repository.interface';
import { ProductRepositoryAdapter } from './infrastructure/persistence/product.repository.adapter';

@Module({
  providers: [
    {
      provide: PRODUCT_REPOSITORY,
      useClass: ProductRepositoryAdapter,
    },
  ],
  exports: [PRODUCT_REPOSITORY],
})
export class CatalogModule {}
