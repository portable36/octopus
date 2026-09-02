export const WAREHOUSE_PROVISIONER = Symbol('WAREHOUSE_PROVISIONER');

export interface WarehouseProvisionInput {
  readonly vendorId: string;
  readonly storeId: string;
  readonly code?: string;
  readonly name?: string;
  readonly addressLine?: string | null;
}

export interface ProvisionerResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface WarehouseProvisionerPort {
  provision(input: WarehouseProvisionInput): Promise<ProvisionerResult>;
}
