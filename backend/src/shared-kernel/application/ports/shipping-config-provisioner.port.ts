export const SHIPPING_CONFIG_PROVISIONER = Symbol('SHIPPING_CONFIG_PROVISIONER');

export interface ShippingConfigProvisionInput {
  readonly vendorId: string;
  readonly storeId: string;
  readonly config: Record<string, unknown>;
}

export interface ProvisionerResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface ShippingConfigProvisionerPort {
  provision(input: ShippingConfigProvisionInput): Promise<ProvisionerResult>;
}
