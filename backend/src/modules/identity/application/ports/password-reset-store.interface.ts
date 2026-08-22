export interface PasswordResetRecord {
  readonly userId: string;
  readonly expiresAt: Date;
}

export const PASSWORD_RESET_STORE = Symbol('PASSWORD_RESET_STORE');

export interface PasswordResetStore {
  store(tokenHash: string, record: PasswordResetRecord): Promise<void>;
  consume(tokenHash: string): Promise<PasswordResetRecord | null>;
}
