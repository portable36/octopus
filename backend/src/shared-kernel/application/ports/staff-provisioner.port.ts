export const STAFF_PROVISIONER = Symbol('STAFF_PROVISIONER');

export interface StaffProvisionInput {
  readonly vendorId: string;
  readonly storeId: string;
  readonly actorUserId: string;
  readonly members: readonly { readonly userId: string; readonly role: string }[];
}

export interface ProvisionerResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface StaffProvisionerPort {
  provision(input: StaffProvisionInput): Promise<ProvisionerResult>;
}
