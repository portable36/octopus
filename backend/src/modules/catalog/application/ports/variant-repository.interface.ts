import type { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import type { Variant } from '../../domain/aggregates/variant.aggregate';

export interface VariantRepository {
  save(variant: Variant): Promise<void>;
  findById(id: UniqueID): Promise<Variant | null>;
  findBySku(sku: string): Promise<Variant | null>;
  findByBarcode(value: string): Promise<Variant | null>;
}

export const VARIANT_REPOSITORY = Symbol('VARIANT_REPOSITORY');
