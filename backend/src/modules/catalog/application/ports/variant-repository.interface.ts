import type { Variant } from '../../domain/aggregates/variant.aggregate';

export const VARIANT_REPOSITORY = Symbol('VARIANT_REPOSITORY');

export interface VariantRepository {
  save(variant: Variant): Promise<void>;
  findById(id: string): Promise<Variant | null>;
  findByProductId(productId: string): Promise<Variant[]>;
  findByVendorAndSku(vendorId: string, sku: string): Promise<Variant | null>;
  existsByVendorAndSku(vendorId: string, sku: string): Promise<boolean>;
}
