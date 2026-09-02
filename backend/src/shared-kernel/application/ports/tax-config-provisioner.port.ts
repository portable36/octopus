export const TAX_CONFIG_PROVISIONER = Symbol('TAX_CONFIG_PROVISIONER');

export interface TaxConfigProvisionInput {
  readonly vendorId: string;
  readonly storeId: string;
  readonly config: Record<string, unknown>;
}

export interface ProvisionerResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface TaxConfigProvisionerPort {
  provision(input: TaxConfigProvisionInput): Promise<ProvisionerResult>;
}
