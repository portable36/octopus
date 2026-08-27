import { describe, expect, it, vi } from 'vitest';
import { User } from '../../domain/aggregates/user.aggregate';
import {
  AccountLockedError,
  InvalidCredentialsError,
  RateLimitExceededError,
} from '../errors/identity.errors';
import { LoginUserHandler } from './login-user.handler';

const PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$hash';
const mfaStub = {
  issueChallenge: vi.fn(),
  beginSetup: vi.fn(),
  confirmEnable: vi.fn(),
  disable: vi.fn(),
  verifyLogin: vi.fn(),
};

describe('LoginUserHandler', () => {
  it('rejects invalid credentials for unknown email', async () => {
    const users = {
      findByEmail: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      findById: vi.fn(),
      existsByEmail: vi.fn(),
      listRecent: vi.fn(),
    };
    const passwordHasher = {
      hash: vi.fn(),
      verify: vi.fn(),
    };
    const rateLimiter = {
      assertAllowed: vi.fn().mockResolvedValue(undefined),
      recordFailure: vi.fn().mockResolvedValue(undefined),
    };
    const authSession = {
      issueSession: vi.fn(),
    };

    const handler = new LoginUserHandler(
      users,
      passwordHasher,
      rateLimiter,
      authSession as never,
      mfaStub as never,
    );

    await expect(
      handler.execute({
        email: 'missing@example.com',
        password: 'Str0ng!Passw0rd',
        rateLimitKey: 'k',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(rateLimiter.recordFailure).toHaveBeenCalledWith('k');
  });

  it('locks the account after invalid password attempts', async () => {
    const user = User.register('u@e.co', 'User', PASSWORD_HASH);
    user.activate();

    const users = {
      findByEmail: vi.fn().mockResolvedValue(user),
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      existsByEmail: vi.fn(),
      listRecent: vi.fn(),
    };
    const passwordHasher = {
      hash: vi.fn(),
      verify: vi.fn().mockResolvedValue(false),
    };
    const rateLimiter = {
      assertAllowed: vi.fn().mockResolvedValue(undefined),
      recordFailure: vi.fn().mockResolvedValue(undefined),
    };

    const handler = new LoginUserHandler(
      users,
      passwordHasher,
      rateLimiter,
      { issueSession: vi.fn() } as never,
      mfaStub as never,
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        handler.execute({ email: 'u@e.co', password: 'wrong', rateLimitKey: 'k' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }

    expect(user.status).toBe('locked');
    expect(users.save).toHaveBeenCalled();
  });

  it('rejects login when rate limit is exceeded', async () => {
    const rateLimiter = {
      assertAllowed: vi.fn().mockRejectedValue(new RateLimitExceededError()),
      recordFailure: vi.fn(),
    };

    const handler = new LoginUserHandler(
      {
        findByEmail: vi.fn(),
        save: vi.fn(),
        findById: vi.fn(),
        existsByEmail: vi.fn(),
        listRecent: vi.fn(),
      },
      { hash: vi.fn(), verify: vi.fn() },
      rateLimiter,
      { issueSession: vi.fn() } as never,
      mfaStub as never,
    );

    await expect(
      handler.execute({ email: 'u@e.co', password: 'Str0ng!Passw0rd', rateLimitKey: 'k' }),
    ).rejects.toBeInstanceOf(RateLimitExceededError);
  });

  it('rejects login for locked accounts', async () => {
    const user = User.register('u@e.co', 'User', PASSWORD_HASH);
    user.activate();
    user.lock(new Date(Date.now() + 60_000));

    const handler = new LoginUserHandler(
      {
        findByEmail: vi.fn().mockResolvedValue(user),
        save: vi.fn(),
        findById: vi.fn(),
        existsByEmail: vi.fn(),
        listRecent: vi.fn(),
      },
      { hash: vi.fn(), verify: vi.fn().mockResolvedValue(true) },
      { assertAllowed: vi.fn(), recordFailure: vi.fn() },
      { issueSession: vi.fn() } as never,
      mfaStub as never,
    );

    await expect(
      handler.execute({ email: 'u@e.co', password: 'Str0ng!Passw0rd', rateLimitKey: 'k' }),
    ).rejects.toBeInstanceOf(AccountLockedError);
  });

  it('returns mfa_required when MFA is enabled', async () => {
    const user = User.register('u@e.co', 'User', PASSWORD_HASH);
    user.activate();
    user.enableMfa('cipher');
    const mfa = {
      issueChallenge: vi.fn().mockResolvedValue({ mfaToken: 'tok', expiresInSeconds: 300 }),
    };
    const handler = new LoginUserHandler(
      {
        findByEmail: vi.fn().mockResolvedValue(user),
        save: vi.fn().mockResolvedValue(undefined),
        findById: vi.fn(),
        existsByEmail: vi.fn(),
        listRecent: vi.fn(),
      },
      { hash: vi.fn(), verify: vi.fn().mockResolvedValue(true) },
      { assertAllowed: vi.fn().mockResolvedValue(undefined), recordFailure: vi.fn() },
      { issueSession: vi.fn() } as never,
      mfa as never,
    );

    const result = await handler.execute({
      email: 'u@e.co',
      password: 'Str0ng!Passw0rd',
      rateLimitKey: 'k',
    });
    expect(result).toEqual({
      kind: 'mfa_required',
      mfaToken: 'tok',
      expiresInSeconds: 300,
    });
  });
});
