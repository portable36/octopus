export interface EmailVerificationRecord {
  readonly userId: string;
  readonly expiresAt: Date;
}

export const EMAIL_VERIFICATION_STORE = Symbol('EMAIL_VERIFICATION_STORE');

export interface EmailVerificationStore {
  store(tokenHash: string, record: EmailVerificationRecord): Promise<void>;
  consume(tokenHash: string): Promise<EmailVerificationRecord | null>;
}
