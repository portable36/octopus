import type { Vendor } from '../../domain/aggregates/vendor.aggregate';

export const VENDOR_REPOSITORY = Symbol('VENDOR_REPOSITORY');

export interface VendorRepository {
  save(vendor: Vendor): Promise<void>;
  findById(id: string): Promise<Vendor | null>;
  findBySlug(slug: string): Promise<Vendor | null>;
  findByOwnerUserId(userId: string): Promise<Vendor[]>;
  findByStaffUserId(userId: string): Promise<Vendor[]>;
  listAll(): Promise<Vendor[]>;
  existsBySlug(slug: string): Promise<boolean>;
}
