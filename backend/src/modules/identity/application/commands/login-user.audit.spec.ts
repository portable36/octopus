import { describe, expect, it, vi } from 'vitest';
import { User } from '../../domain/aggregates/user.aggregate';
import { InvalidCredentialsError } from '../errors/identity.errors';
import { LoginUserHandler } from './login-user.handler';

const PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$hash';

describe('LoginUserHandler audit', () => {
  it('records auth.login.failed for unknown email', async () => {
    const audit = { append: vi.fn().mockResolvedValue(undefined) };
    const handler = new LoginUserHandler(
      {
        findByEmail: vi.fn().mockResolvedValue(null),
        save: vi.fn(),
        findById: vi.fn(),
        existsByEmail: vi.fn(),
        listRecent: vi.fn(),
      },
      { hash: vi.fn(), verify: vi.fn() },
      {
        assertAllowed: vi.fn().mockResolvedValue(undefined),
        recordFailure: vi.fn().mockResolvedValue(undefined),
      },
      { issueSession: vi.fn() } as never,
      audit,
    );

    await expect(
      handler.execute({
        email: 'missing@example.com',
        password: 'Str0ng!Passw0rd',
        rateLimitKey: 'k',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login.failed',
        metadata: expect.objectContaining({ reason: 'unknown_email' }),
      }),
    );
  });

  it('records auth.login.succeeded on valid login', async () => {
    const user = User.register('u@e.co', 'User', PASSWORD_HASH);
    user.activate();
    const audit = { append: vi.fn().mockResolvedValue(undefined) };
    const handler = new LoginUserHandler(
      {
        findByEmail: vi.fn().mockResolvedValue(user),
        save: vi.fn().mockResolvedValue(undefined),
        findById: vi.fn(),
        existsByEmail: vi.fn(),
        listRecent: vi.fn(),
      },
      { hash: vi.fn(), verify: vi.fn().mockResolvedValue(true) },
      {
        assertAllowed: vi.fn().mockResolvedValue(undefined),
        recordFailure: vi.fn(),
      },
      {
        issueSession: vi.fn().mockResolvedValue({
          accessToken: 'a',
          refreshToken: 'r',
          expiresInSeconds: 900,
        }),
      } as never,
      audit,
    );

    await handler.execute({
      email: 'u@e.co',
      password: 'Str0ng!Passw0rd',
      rateLimitKey: 'k',
    });

    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login.succeeded',
        actorUserId: user.id.value,
      }),
    );
  });
});
