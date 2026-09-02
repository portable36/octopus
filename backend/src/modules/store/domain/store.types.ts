export type StoreStatus =
  | 'draft'
  | 'provisioning'
  | 'failed'
  | 'active'
  | 'suspended'
  | 'maintenance'
  | 'archived'
  | 'closed';

export type StoreStaffRole = 'STORE_MANAGER' | 'STORE_STAFF';

export type StoreType =
  | 'online'
  | 'physical'
  | 'online_physical'
  | 'warehouse'
  | 'outlet'
  | 'pickup_point'
  | 'popup'
  | 'marketplace';

export type StoreOwnershipKind = 'vendor_owned' | 'platform_owned';

export interface StoreProfile {
  readonly displayName: string;
  readonly slug: string;
  readonly description: string | null;
}

export interface StoreContact {
  readonly phone: string | null;
  readonly email: string | null;
  readonly supportEmail: string | null;
}

export interface StoreAddress {
  readonly line1: string | null;
  readonly line2: string | null;
  readonly city: string | null;
  readonly region: string | null;
  readonly postalCode: string | null;
  readonly countryCode: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface StoreOpeningHoursEntry {
  readonly day: DayOfWeek;
  readonly open: string | null;
  readonly close: string | null;
  readonly closed: boolean;
}

export interface StoreSettings {
  readonly currencyCode: string;
  readonly timezone: string;
  readonly locale: string;
  readonly acceptsOnlineOrders: boolean;
  readonly codEnabled: boolean;
  readonly codMinAmountMinor: number;
  readonly codMaxAmountMinor: number | null;
  readonly codReservationTtlHours: number;
}

export interface StoreStaffMember {
  readonly userId: string;
  readonly role: StoreStaffRole;
  readonly addedAt: Date;
}

/** Maps legacy `closed` to `archived` for API consumers. */
export function normalizeStoreStatusForResponse(status: StoreStatus): StoreStatus {
  return status === 'closed' ? 'archived' : status;
}
