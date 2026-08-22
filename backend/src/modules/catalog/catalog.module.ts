// apps/backend/src/modules/catalog/catalog.module.ts
import { Module } from '@nestjs/common';
import { ProductController } from './presentation/http/product.controller';
import { IProductRepository } from './application/ports/product-repository.interface';
import { ProductRepositoryAdapter } from './infrastructure/persistence/product.repository.adapter';

@Module({
  imports: [],
  controllers: [ProductController],
  providers: [
    {
      provide: IProductRepository,
      useClass: ProductRepositoryAdapter,
    },
  ],
  exports: [
    // Exporting the Interface Port token lets OTHER modules read or communicate safely
    IProductRepository, 
  ],
})
export class CatalogModule {}
