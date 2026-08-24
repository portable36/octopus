import type { Store } from '../../domain/aggregates/store.aggregate';

export const STORE_REPOSITORY = Symbol('STORE_REPOSITORY');

export interface StoreRepository {
  save(store: Store): Promise<void>;
  findById(id: string): Promise<Store | null>;
  findByVendorId(vendorId: string): Promise<Store[]>;
  findByStaffUserId(userId: string): Promise<Store[]>;
  existsByVendorAndSlug(vendorId: string, slug: string): Promise<boolean>;
}
