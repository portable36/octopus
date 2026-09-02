export const SEO_PROVISIONER = Symbol('SEO_PROVISIONER');

export interface SeoProvisionInput {
  readonly vendorId: string;
  readonly storeId: string;
  readonly config: Record<string, unknown>;
}

export interface ProvisionerResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface SeoProvisionerPort {
  provision(input: SeoProvisionInput): Promise<ProvisionerResult>;
}
