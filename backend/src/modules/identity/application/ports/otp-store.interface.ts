export interface OtpRecord {
  readonly codeHash: string;
  readonly expiresAt: Date;
}

export const OTP_STORE = Symbol('OTP_STORE');

export interface OtpStore {
  store(phoneKey: string, record: OtpRecord): Promise<void>;
  consume(phoneKey: string): Promise<OtpRecord | null>;
}
