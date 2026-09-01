export const VENDOR_ACCESS = Symbol('VENDOR_ACCESS');

export interface VendorAccessSnapshot {
  readonly vendorId: string;
  readonly status: string;
  readonly ownerUserId: string;
  readonly staffUserIds: readonly string[];
  readonly currencyCode: string;
  readonly codEnabled: boolean;
  readonly codMinAmountMinor: number;
  readonly codMaxAmountMinor: number | null;
  readonly codReservationTtlHours: number;
}

export interface VendorPublicSnapshot {
  readonly vendorId: string;
  readonly slug: string;
  readonly displayName: string;
  readonly description: string | null;
}

export interface VendorAccessPort {
  findById(vendorId: string): Promise<VendorAccessSnapshot | null>;
  findActivePublicById(vendorId: string): Promise<VendorPublicSnapshot | null>;
  findActivePublicBySlug(slug: string): Promise<VendorPublicSnapshot | null>;
}
