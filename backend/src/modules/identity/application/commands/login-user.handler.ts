import { Inject, Injectable } from '@nestjs/common';
import {
  AccountDisabledError as DomainAccountDisabledError,
  AccountLockedError as DomainAccountLockedError,
  AccountNotActiveError,
} from '../../domain/errors/user.errors';
import {
  AccountDisabledError,
  AccountLockedError,
  InvalidCredentialsError,
  RateLimitExceededError,
} from '../errors/identity.errors';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.interface';
import { LOGIN_RATE_LIMITER, type LoginRateLimiter } from '../ports/login-rate-limiter.interface';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.interface';
import { AuthSessionService } from '../services/auth-session.service';
import type { AuthSession } from '../dto/auth-session.dto';

export interface LoginUserCommand {
  readonly email: string;
  readonly password: string;
  readonly rateLimitKey: string;
}

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class LoginUserHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(LOGIN_RATE_LIMITER) private readonly rateLimiter: LoginRateLimiter,
    private readonly authSession: AuthSessionService,
  ) {}

  public async execute(command: LoginUserCommand): Promise<AuthSession> {
    try {
      await this.rateLimiter.assertAllowed(command.rateLimitKey);
    } catch {
      throw new RateLimitExceededError();
    }

    const user = await this.users.findByEmail(command.email);
    if (!user) {
      await this.rateLimiter.recordFailure(command.rateLimitKey);
      throw new InvalidCredentialsError();
    }

    try {
      user.assertCanAuthenticate();
    } catch (error) {
      if (error instanceof DomainAccountLockedError) {
        throw new AccountLockedError();
      }
      if (error instanceof DomainAccountDisabledError) {
        throw new AccountDisabledError();
      }
      if (error instanceof AccountNotActiveError) {
        throw new InvalidCredentialsError();
      }
      throw error;
    }

    const valid = await this.passwordHasher.verify(command.password, user.passwordHash);
    if (!valid) {
      user.recordFailedLogin(MAX_FAILED_LOGINS, LOCK_DURATION_MS);
      await this.users.save(user);
      await this.rateLimiter.recordFailure(command.rateLimitKey);
      throw new InvalidCredentialsError();
    }

    user.resetFailedLogins();
    await this.users.save(user);
    return this.authSession.issueSession(user);
  }
}
