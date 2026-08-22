// apps/backend/src/modules/catalog/application/ports/product-repository.interface.ts
import { ProductAggregate } from '../../domain/aggregates/product.aggregate';

export interface IProductRepository {
  save(product: ProductAggregate): Promise<void>;
  findById(id: string): Promise<ProductAggregate | null>;
}
export const IProductRepository = Symbol('IProductRepository');
