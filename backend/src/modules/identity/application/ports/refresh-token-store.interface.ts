export type RefreshTokenStatus = 'active' | 'revoked';

export interface RefreshTokenRecord {
  readonly userId: string;
  readonly familyId: string;
  readonly expiresAt: Date;
  readonly status: RefreshTokenStatus;
}

export const REFRESH_TOKEN_STORE = Symbol('REFRESH_TOKEN_STORE');

export interface RefreshTokenStore {
  store(tokenHash: string, record: RefreshTokenRecord): Promise<void>;
  find(tokenHash: string): Promise<RefreshTokenRecord | null>;
  markRevoked(tokenHash: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
  trackUserFamily(userId: string, familyId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
