import { randomBytes, randomInt } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import { User } from '../../domain/aggregates/user.aggregate';
import { InvalidOtpError } from '../errors/identity.errors';
import type { AuthSession } from '../dto/auth-session.dto';
import {
  LOGIN_RATE_LIMITER,
  type LoginRateLimiter,
} from '../ports/login-rate-limiter.interface';
import { OTP_STORE, type OtpStore } from '../ports/otp-store.interface';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.interface';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.interface';
import { AuthSessionService } from '../services/auth-session.service';

const OTP_TTL_MS = 10 * 60 * 1000;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    throw new InvalidOtpError('Invalid phone number.');
  }
  return digits;
}

function phoneEmail(phoneKey: string): string {
  return `phone-${phoneKey}@octopus.local`;
}

@Injectable()
export class RequestOtpHandler {
  private readonly logger = new Logger(RequestOtpHandler.name);

  constructor(
    @Inject(OTP_STORE) private readonly otpStore: OtpStore,
    @Inject(LOGIN_RATE_LIMITER) private readonly rateLimiter: LoginRateLimiter,
    @Inject(AuthSessionService) private readonly authSession: AuthSessionService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  public async execute(input: {
    readonly phone: string;
    readonly rateLimitKey: string;
  }): Promise<{ sent: true; devCode?: string }> {
    await this.rateLimiter.assertAllowed(input.rateLimitKey);
    await this.rateLimiter.recordFailure(input.rateLimitKey);

    const phoneKey = normalizePhone(input.phone);
    const code = String(randomInt(100_000, 1_000_000));
    const codeHash = this.authSession.hashToken(code);
    await this.otpStore.store(phoneKey, {
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    // ponytail: no SMS provider yet — mock locally / CI; refuse in production until adapter lands.
    if (this.config.isProduction && !this.config.otpMock) {
      throw new InvalidOtpError('OTP delivery is not configured.');
    }

    if (!this.config.isProduction) {
      this.logger.log(`OTP mock issued for phone ending …${phoneKey.slice(-4)}`);
      return { sent: true, devCode: code };
    }

    return { sent: true };
  }
}

@Injectable()
export class VerifyOtpHandler {
  constructor(
    @Inject(OTP_STORE) private readonly otpStore: OtpStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(AuthSessionService) private readonly authSession: AuthSessionService,
    @Inject(LOGIN_RATE_LIMITER) private readonly rateLimiter: LoginRateLimiter,
  ) {}

  public async execute(input: {
    readonly phone: string;
    readonly code: string;
    readonly rateLimitKey: string;
  }): Promise<AuthSession> {
    await this.rateLimiter.assertAllowed(input.rateLimitKey);

    const phoneKey = normalizePhone(input.phone);
    const record = await this.otpStore.consume(phoneKey);
    const codeHash = this.authSession.hashToken(input.code.trim());
    if (!record || record.expiresAt.getTime() <= Date.now() || record.codeHash !== codeHash) {
      await this.rateLimiter.recordFailure(input.rateLimitKey);
      throw new InvalidOtpError();
    }

    const email = phoneEmail(phoneKey);
    let user = await this.users.findByEmail(email);
    if (!user) {
      const passwordHash = await this.passwordHasher.hash(randomBytes(32).toString('base64url'));
      user = User.register(email, `Phone ${phoneKey.slice(-4)}`, passwordHash);
      user.activate();
      user.markEmailVerified();
      await this.users.save(user);
    } else {
      user.assertCanAuthenticate();
    }

    return this.authSession.issueSession(user);
  }
}
