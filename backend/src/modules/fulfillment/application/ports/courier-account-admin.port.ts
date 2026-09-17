import type { CourierProvider } from '../../domain/fulfillment.types';

export const COURIER_ACCOUNT_ADMIN_PORT = Symbol('COURIER_ACCOUNT_ADMIN_PORT');

export type CourierAccountStatusDto = {
  readonly provider: CourierProvider;
  readonly configured: boolean;
  readonly isActive: boolean;
  readonly pathaoStoreId: number | null;
  readonly updatedAt: string | null;
};

/** Presentation-facing courier account admin operations (no secrets). */
export interface CourierAccountAdminPort {
  listAccountStatus(vendorId: string): Promise<readonly CourierAccountStatusDto[]>;
  upsertAccount(input: {
    readonly vendorId: string;
    readonly provider: CourierProvider;
    readonly credentials: Record<string, unknown>;
    readonly pathaoStoreId?: number | null;
  }): Promise<void>;
}
