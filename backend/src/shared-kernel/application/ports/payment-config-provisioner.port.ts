export const PAYMENT_CONFIG_PROVISIONER = Symbol('PAYMENT_CONFIG_PROVISIONER');

export interface PaymentConfigProvisionInput {
  readonly vendorId: string;
  readonly storeId: string;
  readonly config: Record<string, unknown>;
}

export interface ProvisionerResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface PaymentConfigProvisionerPort {
  provision(input: PaymentConfigProvisionInput): Promise<ProvisionerResult>;
}
