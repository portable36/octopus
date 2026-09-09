import type { OAuthProvider } from './oauth-state-store.interface';

export interface OAuthProfile {
  readonly provider: OAuthProvider;
  readonly subject: string;
  readonly email: string;
  readonly name: string;
}

export const OAUTH_PROVIDER_CLIENT = Symbol('OAUTH_PROVIDER_CLIENT');

export interface OAuthProviderClient {
  isMockMode(provider: OAuthProvider): boolean;
  buildAuthorizationUrl(provider: OAuthProvider, state: string): string;
  exchangeAuthorizationCode(
    provider: OAuthProvider,
    code: string,
  ): Promise<OAuthProfile>;
}
