import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import {
  InvalidEmailVerificationTokenError,
  UserNotFoundError,
} from '../errors/identity.errors';
import {
  EMAIL_VERIFICATION_STORE,
  type EmailVerificationStore,
} from '../ports/email-verification-store.interface';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.interface';
import { AuthSessionService } from '../services/auth-session.service';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export interface RequestEmailVerificationCommand {
  readonly email?: string;
  readonly userId?: string;
}

export interface VerifyEmailCommand {
  readonly token: string;
}

@Injectable()
export class RequestEmailVerificationHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EMAIL_VERIFICATION_STORE) private readonly verifyStore: EmailVerificationStore,
    @Inject(AuthSessionService) private readonly authSession: AuthSessionService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  public async execute(
    command: RequestEmailVerificationCommand,
  ): Promise<{ issued: boolean; devToken?: string }> {
    const user = command.userId
      ? await this.users.findById(command.userId)
      : command.email
        ? await this.users.findByEmail(command.email)
        : null;

    if (!user) {
      return { issued: false };
    }

    if (user.emailVerified) {
      return { issued: false };
    }

    const token = this.authSession.generateRefreshToken();
    const tokenHash = this.authSession.hashToken(token);
    await this.verifyStore.store(tokenHash, {
      userId: user.id.value,
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    });

    if (this.config.isProduction) {
      return { issued: true };
    }
    return { issued: true, devToken: token };
  }
}

@Injectable()
export class VerifyEmailHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EMAIL_VERIFICATION_STORE) private readonly verifyStore: EmailVerificationStore,
    @Inject(AuthSessionService) private readonly authSession: AuthSessionService,
  ) {}

  public async execute(command: VerifyEmailCommand): Promise<void> {
    const tokenHash = this.authSession.hashToken(command.token);
    const record = await this.verifyStore.consume(tokenHash);
    if (!record || record.expiresAt.getTime() <= Date.now()) {
      throw new InvalidEmailVerificationTokenError();
    }

    const user = await this.users.findById(record.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    user.markEmailVerified();
    await this.users.save(user);
  }
}

/** Issues a verify token for a newly registered user (fire-and-forget from register). */
@Injectable()
export class EmailVerificationIssuer {
  constructor(
    @Inject(EMAIL_VERIFICATION_STORE) private readonly verifyStore: EmailVerificationStore,
    @Inject(AuthSessionService) private readonly authSession: AuthSessionService,
  ) {}

  public async issueForUser(userId: string): Promise<string> {
    const token = this.authSession.generateRefreshToken();
    const tokenHash = this.authSession.hashToken(token);
    await this.verifyStore.store(tokenHash, {
      userId,
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    });
    return token;
  }
}
