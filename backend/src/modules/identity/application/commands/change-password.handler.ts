import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
import {
  NOTIFICATION_PORT,
  type NotificationPort,
} from '../../../../shared-kernel/application/ports/notification.port';
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
    @Inject(NOTIFICATION_PORT) private readonly notifications: NotificationPort,
    @Optional() @Inject(AUDIT_PORT) private readonly audit: AuditPort | null = null,
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

    // ponytail: identity has no outbox yet — notify inline; upgrade when identity_outbox lands.
    await this.notifications.notify({
      eventId: `notify:password_changed:${user.id.value}:${Date.now()}`,
      recipientUserId: user.id.value,
      recipientEmail: user.email.value,
      type: 'security.password_changed',
      templateKey: 'security.password_changed',
      category: 'SECURITY',
      channels: ['IN_APP', 'EMAIL'],
    });

    await this.audit?.append({
      actorUserId: user.id.value,
      action: 'auth.password.changed',
      resourceType: 'user',
      resourceId: user.id.value,
    });
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
    @Inject(AuthSessionService) private readonly authSession: AuthSessionService,
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
    @Inject(AuthSessionService) private readonly authSession: AuthSessionService,
    @Optional() @Inject(AUDIT_PORT) private readonly audit: AuditPort | null = null,
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
    await this.audit?.append({
      actorUserId: user.id.value,
      action: 'auth.password.reset',
      resourceType: 'user',
      resourceId: user.id.value,
    });
  }
}
