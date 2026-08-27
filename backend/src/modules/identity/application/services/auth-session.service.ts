import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, Inject } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import type { User } from '../../domain/aggregates/user.aggregate';
import type { AuthSession } from '../dto/auth-session.dto';
import {
  REFRESH_TOKEN_STORE,
  type RefreshTokenStore,
} from '../ports/refresh-token-store.interface';
import { TOKEN_SIGNER, type TokenSigner } from '../ports/token-signer.interface';

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly config: AppConfigService,
    @Inject(TOKEN_SIGNER) private readonly tokenSigner: TokenSigner,
    @Inject(REFRESH_TOKEN_STORE) private readonly refreshTokenStore: RefreshTokenStore,
  ) {}

  public async issueSession(user: User, familyId?: string): Promise<AuthSession> {
    const resolvedFamilyId = familyId ?? randomUUID();
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = this.refreshExpiresAt();

    await this.refreshTokenStore.store(refreshTokenHash, {
      userId: user.id.value,
      familyId: resolvedFamilyId,
      expiresAt,
      status: 'active',
    });
    await this.refreshTokenStore.trackUserFamily(user.id.value, resolvedFamilyId);

    const accessToken = await this.tokenSigner.signAccess({
      sub: user.id.value,
      email: user.email.value,
      roles: user.roles,
      mfaEnabled: user.mfaEnabled,
    });

    return {
      accessToken,
      refreshToken,
      expiresInSeconds: this.config.accessTokenExpiresInSeconds,
      user: {
        userId: user.id.value,
        email: user.email.value,
        roles: user.roles,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }

  public hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  public generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  public refreshExpiresAt(): Date {
    return new Date(Date.now() + this.config.refreshTokenExpiresInMs);
  }
}
