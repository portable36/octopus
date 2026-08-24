export const STORE_ACCESS = Symbol('STORE_ACCESS');

export interface StoreAccessSnapshot {
  readonly storeId: string;
  readonly vendorId: string;
  readonly status: string;
  readonly displayName: string;
  readonly locale: string;
  readonly currencyCode: string;
  readonly addressLine1: string | null;
  readonly city: string | null;
  readonly region: string | null;
  readonly managerUserIds: readonly string[];
  readonly staffUserIds: readonly string[];
}

export interface StoreAccessPort {
  findById(storeId: string): Promise<StoreAccessSnapshot | null>;
}
