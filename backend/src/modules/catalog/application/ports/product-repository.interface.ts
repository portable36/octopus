import type { Product } from '../../domain/aggregates/product.aggregate';

export interface ProductRepository {
  save(product: Product): Promise<void>;
  findById(id: string): Promise<Product | null>;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
