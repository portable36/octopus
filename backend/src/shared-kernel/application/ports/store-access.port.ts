export const STORE_ACCESS = Symbol('STORE_ACCESS');

export interface StoreAccessSnapshot {
  readonly storeId: string;
  readonly vendorId: string;
  readonly status: string;
  readonly displayName: string;
  readonly slug: string;
  readonly description: string | null;
  readonly locale: string;
  readonly currencyCode: string;
  readonly acceptsOnlineOrders: boolean;
  readonly addressLine1: string | null;
  readonly city: string | null;
  readonly region: string | null;
  readonly managerUserIds: readonly string[];
  readonly staffUserIds: readonly string[];
  readonly codEnabled: boolean;
  readonly codMinAmountMinor: number;
  readonly codMaxAmountMinor: number | null;
  readonly codReservationTtlHours: number;
}

export interface StoreAccessPort {
  findById(storeId: string): Promise<StoreAccessSnapshot | null>;
  findActiveBySlug(slug: string, vendorId?: string): Promise<StoreAccessSnapshot | null>;
}
