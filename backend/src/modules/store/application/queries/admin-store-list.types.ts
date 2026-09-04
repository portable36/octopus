import type { StoreStatus, StoreType } from '../../domain/store.types';

export type AdminStoreListSort = 'createdAt_desc' | 'createdAt_asc' | 'name_asc' | 'name_desc';

export type AdminStoreListQuery = {
  readonly q?: string;
  /** Comma-separated statuses are accepted by the HTTP layer and normalized here. */
  readonly statuses?: readonly StoreStatus[];
  readonly vendorId?: string;
  readonly storeType?: StoreType;
  readonly country?: string;
  readonly page: number;
  readonly limit: number;
  readonly sort: AdminStoreListSort;
};

export type AdminStoreListRow = {
  readonly id: string;
  readonly vendorId: string;
  readonly vendorDisplayName: string | null;
  readonly storeCode: string;
  readonly storeType: StoreType;
  readonly status: StoreStatus;
  readonly displayName: string;
  readonly slug: string;
  readonly city: string | null;
  readonly region: string | null;
  readonly countryCode: string;
  readonly createdAt: Date;
};

export type AdminStoreListResult = {
  readonly items: readonly AdminStoreListRow[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
};

export type AdminStoreStats = {
  readonly total: number;
  readonly byStatus: Readonly<Record<string, number>>;
};
