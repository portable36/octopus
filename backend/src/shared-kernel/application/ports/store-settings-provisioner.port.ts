export const STORE_SETTINGS_PROVISIONER = Symbol('STORE_SETTINGS_PROVISIONER');

export interface StoreSettingsProvisionInput {
  readonly vendorId: string;
  readonly storeId: string;
  readonly actorUserId: string;
  readonly general: Record<string, unknown>;
  readonly branding: Record<string, unknown>;
}

export interface ProvisionerResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface StoreSettingsProvisionerPort {
  provision(input: StoreSettingsProvisionInput): Promise<ProvisionerResult>;
}
