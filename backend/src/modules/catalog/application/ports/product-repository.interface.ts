import type { Product } from '../../domain/aggregates/product.aggregate';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductRepository {
  save(product: Product): Promise<void>;
  findById(id: string): Promise<Product | null>;
  findByVendorId(vendorId: string): Promise<Product[]>;
  existsByVendorAndSku(vendorId: string, sku: string): Promise<boolean>;
  /** Public storefront: published products only (RLS + status filter). */
  findPublishedById(id: string): Promise<Product | null>;
}
