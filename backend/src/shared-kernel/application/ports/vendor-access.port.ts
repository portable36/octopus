export const VENDOR_ACCESS = Symbol('VENDOR_ACCESS');

export interface VendorAccessSnapshot {
  readonly vendorId: string;
  readonly status: string;
  readonly ownerUserId: string;
  readonly staffUserIds: readonly string[];
}

export interface VendorAccessPort {
  findById(vendorId: string): Promise<VendorAccessSnapshot | null>;
}
