export type OAuthProvider = 'google' | 'facebook';

export interface OAuthStateRecord {
  readonly provider: OAuthProvider;
  readonly expiresAt: Date;
}

export const OAUTH_STATE_STORE = Symbol('OAUTH_STATE_STORE');

export interface OAuthStateStore {
  store(state: string, record: OAuthStateRecord): Promise<void>;
  consume(state: string): Promise<OAuthStateRecord | null>;
}
