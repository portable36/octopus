export const MEMBERSHIP_DIRECTORY = Symbol('MEMBERSHIP_DIRECTORY');

export interface MembershipRecord {
  readonly userId: string;
  readonly vendorId: string;
  readonly storeIds: readonly string[];
}

export interface MembershipDirectory {
  findByUserId(userId: string): Promise<MembershipRecord | null>;
  upsertVendorMembership(
    userId: string,
    vendorId: string,
    storeIds?: readonly string[],
  ): Promise<void>;
  removeVendorMembership(userId: string, vendorId: string): Promise<void>;
  assignStoreMembership(userId: string, vendorId: string, storeId: string): Promise<void>;
  revokeStoreMembership(userId: string, vendorId: string, storeId: string): Promise<void>;
}
