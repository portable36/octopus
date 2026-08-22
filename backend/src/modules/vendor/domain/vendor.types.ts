export type VendorStatus =
  'pending' | 'under_review' | 'approved' | 'active' | 'suspended' | 'rejected';

export type VendorStaffRole = 'VENDOR_OWNER' | 'VENDOR_STAFF';

export interface VendorProfile {
  readonly displayName: string;
  readonly slug: string;
  readonly description: string | null;
}

export interface VendorBusinessInfo {
  readonly legalName: string;
  readonly registrationNumber: string | null;
  readonly taxId: string | null;
}

export interface VendorContactInfo {
  readonly email: string;
  readonly phone: string | null;
  readonly addressLine: string | null;
  readonly city: string | null;
  readonly countryCode: string;
}

export interface VendorSettings {
  readonly currencyCode: string;
  readonly timezone: string;
  readonly acceptsOnlineOrders: boolean;
}

export interface VendorStaffMember {
  readonly userId: string;
  readonly role: VendorStaffRole;
  readonly addedAt: Date;
}
