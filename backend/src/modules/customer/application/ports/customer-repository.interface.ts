import type { CustomerAddressRecord, CustomerProfileRecord } from '../../domain/customer.types';

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');

export interface CustomerRepository {
  getProfile(userId: string): Promise<CustomerProfileRecord | null>;
  upsertProfile(
    userId: string,
    patch: { readonly displayName?: string; readonly phone?: string | null },
  ): Promise<CustomerProfileRecord>;
  listAddresses(userId: string): Promise<readonly CustomerAddressRecord[]>;
  findAddress(userId: string, addressId: string): Promise<CustomerAddressRecord | null>;
  saveAddress(address: CustomerAddressRecord): Promise<CustomerAddressRecord>;
  deleteAddress(userId: string, addressId: string): Promise<boolean>;
  clearDefaultFlags(userId: string): Promise<void>;
}
