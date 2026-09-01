export const VENDOR_REGISTRATION_POLICY = Symbol('VENDOR_REGISTRATION_POLICY');

export interface VendorRegistrationPolicy {
  isEnabled(): Promise<boolean>;
}
