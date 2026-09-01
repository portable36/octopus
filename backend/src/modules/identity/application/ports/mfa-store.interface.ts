export const MFA_CHALLENGE_STORE = Symbol('MFA_CHALLENGE_STORE');

export interface MfaChallengeRecord {
  readonly userId: string;
  readonly expiresAt: Date;
}

export interface MfaChallengeStore {
  create(userId: string, ttlSeconds: number): Promise<string>;
  consume(token: string): Promise<MfaChallengeRecord | null>;
}

export const MFA_SETUP_STORE = Symbol('MFA_SETUP_STORE');

export interface MfaSetupStore {
  /** Creates a setup secret only when none is active, returning the active secret. */
  putIfAbsent(userId: string, secretBase32: string, ttlSeconds: number): Promise<string>;
  put(userId: string, secretBase32: string, ttlSeconds: number): Promise<void>;
  take(userId: string): Promise<string | null>;
}
