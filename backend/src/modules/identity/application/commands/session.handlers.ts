import { Inject, Injectable } from '@nestjs/common';
import { InvalidRefreshTokenError, TokenReuseDetectedError } from '../errors/identity.errors';
import {
  REFRESH_TOKEN_STORE,
  type RefreshTokenStore,
} from '../ports/refresh-token-store.interface';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.interface';
import { AuthSessionService } from '../services/auth-session.service';
import type { AuthSession } from '../dto/auth-session.dto';

@Injectable()
export class LogoutUserHandler {
  constructor(
    @Inject(REFRESH_TOKEN_STORE) private readonly refreshTokenStore: RefreshTokenStore,
    private readonly authSession: AuthSessionService,
  ) {}

  public async execute(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = this.authSession.hashToken(refreshToken);
    const record = await this.refreshTokenStore.find(tokenHash);
    if (!record) {
      return;
    }

    await this.refreshTokenStore.markRevoked(tokenHash);
  }
}

@Injectable()
export class RefreshSessionHandler {
  constructor(
    @Inject(REFRESH_TOKEN_STORE) private readonly refreshTokenStore: RefreshTokenStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly authSession: AuthSessionService,
  ) {}

  public async execute(refreshToken: string): Promise<AuthSession> {
    const tokenHash = this.authSession.hashToken(refreshToken);
    const record = await this.refreshTokenStore.find(tokenHash);

    if (!record) {
      throw new InvalidRefreshTokenError();
    }

    if (record.status === 'revoked') {
      await this.refreshTokenStore.revokeFamily(record.familyId);
      throw new TokenReuseDetectedError();
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await this.refreshTokenStore.markRevoked(tokenHash);
      throw new InvalidRefreshTokenError();
    }

    await this.refreshTokenStore.markRevoked(tokenHash);

    const user = await this.users.findById(record.userId);
    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    user.assertCanAuthenticate();
    return this.authSession.issueSession(user, record.familyId);
  }
}
