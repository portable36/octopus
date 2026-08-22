import { Inject, Injectable } from '@nestjs/common';
import {
  PasswordPolicy,
  PasswordPolicyViolationError,
} from '../../domain/value-objects/password-policy.value-object';
import {
  InvalidCredentialsError,
  InvalidPasswordResetTokenError,
  UserNotFoundError,
} from '../errors/identity.errors';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.interface';
import {
  PASSWORD_RESET_STORE,
  type PasswordResetStore,
} from '../ports/password-reset-store.interface';
import {
  REFRESH_TOKEN_STORE,
  type RefreshTokenStore,
} from '../ports/refresh-token-store.interface';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.interface';
import { AuthSessionService } from '../services/auth-session.service';

export interface ChangePasswordCommand {
  readonly userId: string;
  readonly currentPassword: string;
  readonly newPassword: string;
}

@Injectable()
export class ChangePasswordHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(REFRESH_TOKEN_STORE) private readonly refreshTokenStore: RefreshTokenStore,
  ) {}

  public async execute(command: ChangePasswordCommand): Promise<void> {
    PasswordPolicy.validate(command.newPassword);

    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    user.assertCanAuthenticate();

    const valid = await this.passwordHasher.verify(command.currentPassword, user.passwordHash);
    if (!valid) {
      throw new InvalidCredentialsError();
    }

    const newHash = await this.passwordHasher.hash(command.newPassword);
    user.changePassword(newHash);
    await this.users.save(user);
    await this.refreshTokenStore.revokeAllForUser(user.id.value);
  }
}

export interface RequestPasswordResetCommand {
  readonly email: string;
}

export interface ResetPasswordCommand {
  readonly token: string;
  readonly newPassword: string;
}

@Injectable()
export class RequestPasswordResetHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_STORE) private readonly passwordResetStore: PasswordResetStore,
    private readonly authSession: AuthSessionService,
  ) {}

  public async execute(command: RequestPasswordResetCommand): Promise<string | null> {
    const user = await this.users.findByEmail(command.email);
    if (!user) {
      return null;
    }

    const token = this.authSession.generateRefreshToken();
    const tokenHash = this.authSession.hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.passwordResetStore.store(tokenHash, {
      userId: user.id.value,
      expiresAt,
    });

    return token;
  }
}

@Injectable()
export class ResetPasswordHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(PASSWORD_RESET_STORE) private readonly passwordResetStore: PasswordResetStore,
    @Inject(REFRESH_TOKEN_STORE) private readonly refreshTokenStore: RefreshTokenStore,
    private readonly authSession: AuthSessionService,
  ) {}

  public async execute(command: ResetPasswordCommand): Promise<void> {
    try {
      PasswordPolicy.validate(command.newPassword);
    } catch (error) {
      if (error instanceof PasswordPolicyViolationError) {
        throw error;
      }
      throw error;
    }

    const tokenHash = this.authSession.hashToken(command.token);
    const record = await this.passwordResetStore.consume(tokenHash);
    if (!record || record.expiresAt.getTime() <= Date.now()) {
      throw new InvalidPasswordResetTokenError();
    }

    const user = await this.users.findById(record.userId);
    if (!user) {
      throw new InvalidPasswordResetTokenError();
    }

    const newHash = await this.passwordHasher.hash(command.newPassword);
    user.changePassword(newHash);
    if (user.status === 'locked') {
      user.unlock();
    }
    user.resetFailedLogins();
    await this.users.save(user);
    await this.refreshTokenStore.revokeAllForUser(user.id.value);
  }
}
