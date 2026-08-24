export type StoreStatus = 'draft' | 'active' | 'suspended' | 'closed';

export type StoreStaffRole = 'STORE_MANAGER' | 'STORE_STAFF';

export interface StoreProfile {
  readonly displayName: string;
  readonly slug: string;
  readonly description: string | null;
}

export interface StoreAddress {
  readonly line1: string | null;
  readonly line2: string | null;
  readonly city: string | null;
  readonly region: string | null;
  readonly postalCode: string | null;
  readonly countryCode: string;
}

export interface StoreSettings {
  readonly currencyCode: string;
  readonly timezone: string;
  readonly locale: string;
  readonly acceptsOnlineOrders: boolean;
}

export interface StoreStaffMember {
  readonly userId: string;
  readonly role: StoreStaffRole;
  readonly addedAt: Date;
}
