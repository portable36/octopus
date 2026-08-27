import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
import { buildOtpAuthUrl, generateTotpSecret, verifyTotp } from '../../domain/services/totp';
import type { AuthSession } from '../dto/auth-session.dto';
import {
  InvalidCredentialsError,
  InvalidMfaChallengeError,
  InvalidMfaCodeError,
  MfaAlreadyEnabledError,
  MfaNotEnabledError,
  MfaSetupRequiredError,
  UserNotFoundError,
} from '../errors/identity.errors';
import { MFA_SECRET_BOX, type MfaSecretBox } from '../ports/mfa-secret-box.interface';
import {
  MFA_CHALLENGE_STORE,
  MFA_SETUP_STORE,
  type MfaChallengeStore,
  type MfaSetupStore,
} from '../ports/mfa-store.interface';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.interface';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.interface';
import { AuthSessionService } from '../services/auth-session.service';

const MFA_CHALLENGE_TTL_SEC = 300;
const MFA_SETUP_TTL_SEC = 600;

@Injectable()
export class MfaHandlers {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(MFA_CHALLENGE_STORE) private readonly challenges: MfaChallengeStore,
    @Inject(MFA_SETUP_STORE) private readonly setups: MfaSetupStore,
    @Inject(MFA_SECRET_BOX) private readonly secrets: MfaSecretBox,
    private readonly authSession: AuthSessionService,
    @Optional() @Inject(AUDIT_PORT) private readonly audit: AuditPort | null = null,
  ) {}

  public async beginSetup(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    if (user.mfaEnabled) {
      throw new MfaAlreadyEnabledError();
    }
    const secret = generateTotpSecret();
    await this.setups.put(userId, secret, MFA_SETUP_TTL_SEC);
    return {
      secret,
      otpauthUrl: buildOtpAuthUrl({ secretBase32: secret, accountName: user.email.value }),
    };
  }

  public async confirmEnable(userId: string, code: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    if (user.mfaEnabled) {
      throw new MfaAlreadyEnabledError();
    }
    const secret = await this.setups.take(userId);
    if (!secret) {
      throw new MfaSetupRequiredError();
    }
    if (!verifyTotp(secret, code)) {
      await this.setups.put(userId, secret, MFA_SETUP_TTL_SEC);
      throw new InvalidMfaCodeError();
    }
    user.enableMfa(this.secrets.seal(secret));
    await this.users.save(user);
    await this.audit?.append({
      actorUserId: userId,
      action: 'auth.mfa.enabled',
      resourceType: 'user',
      resourceId: userId,
    });
  }

  public async disable(userId: string, password: string, code: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    if (!user.mfaEnabled || !user.mfaSecretCipher) {
      throw new MfaNotEnabledError();
    }
    const passwordOk = await this.passwordHasher.verify(password, user.passwordHash);
    if (!passwordOk) {
      throw new InvalidCredentialsError();
    }
    const secret = this.secrets.open(user.mfaSecretCipher);
    if (!verifyTotp(secret, code)) {
      throw new InvalidMfaCodeError();
    }
    user.disableMfa();
    await this.users.save(user);
    await this.audit?.append({
      actorUserId: userId,
      action: 'auth.mfa.disabled',
      resourceType: 'user',
      resourceId: userId,
    });
  }

  public async issueChallenge(userId: string): Promise<{
    mfaToken: string;
    expiresInSeconds: number;
  }> {
    const mfaToken = await this.challenges.create(userId, MFA_CHALLENGE_TTL_SEC);
    return { mfaToken, expiresInSeconds: MFA_CHALLENGE_TTL_SEC };
  }

  public async verifyLogin(mfaToken: string, code: string): Promise<AuthSession> {
    const challenge = await this.challenges.consume(mfaToken);
    if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
      throw new InvalidMfaChallengeError();
    }
    const user = await this.users.findById(challenge.userId);
    if (!user || !user.mfaEnabled || !user.mfaSecretCipher) {
      throw new InvalidMfaChallengeError();
    }
    const secret = this.secrets.open(user.mfaSecretCipher);
    if (!verifyTotp(secret, code)) {
      throw new InvalidMfaCodeError();
    }
    const session = await this.authSession.issueSession(user);
    await this.audit?.append({
      actorUserId: user.id.value,
      action: 'auth.login.succeeded',
      resourceType: 'user',
      resourceId: user.id.value,
      metadata: { email: user.email.value, mfa: true },
    });
    return session;
  }
}
