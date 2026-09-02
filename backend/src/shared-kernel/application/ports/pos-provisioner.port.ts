export const POS_PROVISIONER = Symbol('POS_PROVISIONER');

export interface PosProvisionInput {
  readonly vendorId: string;
  readonly storeId: string;
  readonly actorUserId: string;
  readonly displayName: string;
  readonly locale: string;
  readonly currencyCode: string;
  readonly addressLines: readonly string[];
}

export interface ProvisionerResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface PosProvisionerPort {
  provision(input: PosProvisionInput): Promise<ProvisionerResult>;
}
