import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/aggregates/user.aggregate';
import {
  InvalidOAuthCodeError,
  InvalidOAuthProviderError,
  InvalidOAuthStateError,
} from '../errors/identity.errors';
import type { AuthSession } from '../dto/auth-session.dto';
import {
  OAUTH_PROVIDER_CLIENT,
  type OAuthProviderClient,
} from '../ports/oauth-provider.interface';
import {
  OAUTH_STATE_STORE,
  type OAuthProvider,
  type OAuthStateStore,
} from '../ports/oauth-state-store.interface';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.interface';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.interface';
import { AuthSessionService } from '../services/auth-session.service';

const STATE_TTL_MS = 10 * 60 * 1000;
const PROVIDERS: readonly OAuthProvider[] = ['google', 'facebook'];

export function parseOAuthProvider(raw: string): OAuthProvider {
  if ((PROVIDERS as readonly string[]).includes(raw)) {
    return raw as OAuthProvider;
  }
  throw new InvalidOAuthProviderError();
}

@Injectable()
export class StartOAuthHandler {
  constructor(
    @Inject(OAUTH_PROVIDER_CLIENT) private readonly oauth: OAuthProviderClient,
    @Inject(OAUTH_STATE_STORE) private readonly stateStore: OAuthStateStore,
    @Inject(AuthSessionService) private readonly authSession: AuthSessionService,
  ) {}

  public async execute(providerRaw: string): Promise<{ authorizationUrl: string }> {
    const provider = parseOAuthProvider(providerRaw);
    const state = this.authSession.generateRefreshToken();
    await this.stateStore.store(state, {
      provider,
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    });
    return { authorizationUrl: this.oauth.buildAuthorizationUrl(provider, state) };
  }
}

@Injectable()
export class CompleteOAuthHandler {
  constructor(
    @Inject(OAUTH_PROVIDER_CLIENT) private readonly oauth: OAuthProviderClient,
    @Inject(OAUTH_STATE_STORE) private readonly stateStore: OAuthStateStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(AuthSessionService) private readonly authSession: AuthSessionService,
  ) {}

  public async execute(input: {
    readonly provider: string;
    readonly code: string;
    readonly state: string;
  }): Promise<AuthSession> {
    const provider = parseOAuthProvider(input.provider);
    const stateRecord = await this.stateStore.consume(input.state);
    if (
      !stateRecord ||
      stateRecord.provider !== provider ||
      stateRecord.expiresAt.getTime() <= Date.now()
    ) {
      throw new InvalidOAuthStateError();
    }

    let profile;
    try {
      profile = await this.oauth.exchangeAuthorizationCode(provider, input.code);
    } catch (error) {
      if (error instanceof InvalidOAuthCodeError) {
        throw error;
      }
      throw new InvalidOAuthCodeError();
    }

    const syntheticEmail = `oauth-${provider}-${profile.subject}@octopus.local`;
    const email = profile.email.includes('@') ? profile.email : syntheticEmail;

    let user = await this.users.findByEmail(email);
    if (!user && email !== syntheticEmail) {
      user = await this.users.findByEmail(syntheticEmail);
    }

    if (!user) {
      const passwordHash = await this.passwordHasher.hash(randomBytes(32).toString('base64url'));
      user = User.register(email, profile.name, passwordHash);
      user.activate();
      user.markEmailVerified();
      await this.users.save(user);
    } else {
      user.assertCanAuthenticate();
      if (!user.emailVerified) {
        user.markEmailVerified();
        await this.users.save(user);
      }
    }

    return this.authSession.issueSession(user);
  }
}
