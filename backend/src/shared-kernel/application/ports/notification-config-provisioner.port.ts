export const NOTIFICATION_CONFIG_PROVISIONER = Symbol('NOTIFICATION_CONFIG_PROVISIONER');

export interface NotificationConfigProvisionInput {
  readonly vendorId: string;
  readonly storeId: string;
  readonly config: Record<string, unknown>;
}

export interface ProvisionerResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface NotificationConfigProvisionerPort {
  provision(input: NotificationConfigProvisionInput): Promise<ProvisionerResult>;
}
