import type { Store } from '../../domain/aggregates/store.aggregate';

export const STORE_REPOSITORY = Symbol('STORE_REPOSITORY');

export interface StoreRepository {
  save(store: Store): Promise<void>;
  findById(id: string): Promise<Store | null>;
  findByVendorId(vendorId: string): Promise<Store[]>;
  findByStaffUserId(userId: string): Promise<Store[]>;
  listAll(): Promise<Store[]>;
  existsByVendorAndSlug(vendorId: string, slug: string): Promise<boolean>;
  existsByVendorAndStoreCode(vendorId: string, storeCode: string): Promise<boolean>;
  /** Public storefront: active stores only. Optional vendorId disambiguates slug. */
  findActiveBySlug(slug: string, vendorId?: string): Promise<Store | null>;
}
