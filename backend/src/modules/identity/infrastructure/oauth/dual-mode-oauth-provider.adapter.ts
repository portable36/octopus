import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import { InvalidOAuthCodeError } from '../../application/errors/identity.errors';
import type {
  OAuthProfile,
  OAuthProviderClient,
} from '../../application/ports/oauth-provider.interface';
import type { OAuthProvider } from '../../application/ports/oauth-state-store.interface';

const MOCK_CODE = 'mock-oauth-code';

@Injectable()
export class DualModeOAuthProviderAdapter implements OAuthProviderClient {
  private readonly logger = new Logger(DualModeOAuthProviderAdapter.name);

  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  public isMockMode(provider: OAuthProvider): boolean {
    if (this.config.oauthMock || this.config.isTest) {
      return true;
    }
    return !this.hasCredentials(provider);
  }

  public buildAuthorizationUrl(provider: OAuthProvider, state: string): string {
    if (this.isMockMode(provider)) {
      const base = this.config.storefrontUrl.replace(/\/$/, '');
      const url = new URL(`${base}/login`);
      url.searchParams.set('oauth_provider', provider);
      url.searchParams.set('oauth_state', state);
      url.searchParams.set('oauth_mock', '1');
      return url.toString();
    }

    if (provider === 'google') {
      const clientId = this.config.googleOAuthClientId!;
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', this.redirectUri(provider));
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'openid email profile');
      url.searchParams.set('state', state);
      url.searchParams.set('access_type', 'online');
      url.searchParams.set('prompt', 'select_account');
      return url.toString();
    }

    const clientId = this.config.facebookOAuthClientId!;
    const url = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', this.redirectUri(provider));
    url.searchParams.set('state', state);
    url.searchParams.set('scope', 'email,public_profile');
    url.searchParams.set('response_type', 'code');
    return url.toString();
  }

  public async exchangeAuthorizationCode(
    provider: OAuthProvider,
    code: string,
  ): Promise<OAuthProfile> {
    if (this.isMockMode(provider)) {
      if (code !== MOCK_CODE) {
        throw new InvalidOAuthCodeError();
      }
      const subject = 'mock-user';
      return {
        provider,
        subject,
        email: `oauth-${provider}-${subject}@octopus.local`,
        name: `OAuth ${provider}`,
      };
    }

    if (provider === 'google') {
      return this.exchangeGoogle(code);
    }
    return this.exchangeFacebook(code);
  }

  private hasCredentials(provider: OAuthProvider): boolean {
    if (provider === 'google') {
      return Boolean(this.config.googleOAuthClientId && this.config.googleOAuthClientSecret);
    }
    return Boolean(this.config.facebookOAuthClientId && this.config.facebookOAuthClientSecret);
  }

  private redirectUri(provider: OAuthProvider): string {
    const base = (this.config.oauthRedirectBaseUrl ?? this.config.storefrontUrl).replace(/\/$/, '');
    return `${base}/auth/oauth/${provider}/callback`;
  }

  private async exchangeGoogle(code: string): Promise<OAuthProfile> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.googleOAuthClientId!,
        client_secret: this.config.googleOAuthClientSecret!,
        redirect_uri: this.redirectUri('google'),
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!tokenRes.ok) {
      this.logger.warn('Google token exchange failed', { status: tokenRes.status });
      throw new InvalidOAuthCodeError();
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      throw new InvalidOAuthCodeError();
    }

    const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!profileRes.ok) {
      throw new InvalidOAuthCodeError();
    }
    const profile = (await profileRes.json()) as {
      sub?: string;
      email?: string;
      name?: string;
    };
    if (!profile.sub || !profile.email) {
      throw new InvalidOAuthCodeError();
    }
    return {
      provider: 'google',
      subject: profile.sub,
      email: profile.email.toLowerCase(),
      name: (profile.name ?? 'Google user').trim() || 'Google user',
    };
  }

  private async exchangeFacebook(code: string): Promise<OAuthProfile> {
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', this.config.facebookOAuthClientId!);
    tokenUrl.searchParams.set('client_secret', this.config.facebookOAuthClientSecret!);
    tokenUrl.searchParams.set('redirect_uri', this.redirectUri('facebook'));
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl, { signal: AbortSignal.timeout(15_000) });
    if (!tokenRes.ok) {
      this.logger.warn('Facebook token exchange failed', { status: tokenRes.status });
      throw new InvalidOAuthCodeError();
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      throw new InvalidOAuthCodeError();
    }

    const meUrl = new URL('https://graph.facebook.com/me');
    meUrl.searchParams.set('fields', 'id,name,email');
    meUrl.searchParams.set('access_token', tokenJson.access_token);
    const profileRes = await fetch(meUrl, { signal: AbortSignal.timeout(15_000) });
    if (!profileRes.ok) {
      throw new InvalidOAuthCodeError();
    }
    const profile = (await profileRes.json()) as {
      id?: string;
      email?: string;
      name?: string;
    };
    if (!profile.id) {
      throw new InvalidOAuthCodeError();
    }
    const email =
      profile.email?.toLowerCase() ?? `oauth-facebook-${profile.id}@octopus.local`;
    return {
      provider: 'facebook',
      subject: profile.id,
      email,
      name: (profile.name ?? 'Facebook user').trim() || 'Facebook user',
    };
  }
}
