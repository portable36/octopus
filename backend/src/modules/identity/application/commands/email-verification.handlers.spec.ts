import { describe, expect, it, vi } from 'vitest';
import { User } from '../../domain/aggregates/user.aggregate';
import { InvalidEmailVerificationTokenError } from '../errors/identity.errors';
import { VerifyEmailHandler } from './email-verification.handlers';

const PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$hash';

describe('VerifyEmailHandler', () => {
  it('marks the user email verified and persists', async () => {
    const user = User.register('a@b.co', 'A', PASSWORD_HASH);
    user.activate();
    expect(user.emailVerified).toBe(false);

    const users = {
      findById: vi.fn().mockResolvedValue(user),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const verifyStore = {
      consume: vi.fn().mockResolvedValue({
        userId: user.id.value,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    };
    const authSession = {
      hashToken: vi.fn().mockReturnValue('token-hash'),
    };

    const handler = new VerifyEmailHandler(
      users as never,
      verifyStore as never,
      authSession as never,
    );

    await handler.execute({ token: 'raw-token' });

    expect(user.emailVerified).toBe(true);
    expect(users.save).toHaveBeenCalledWith(user);
  });

  it('rejects expired or missing tokens', async () => {
    const handler = new VerifyEmailHandler(
      { findById: vi.fn(), save: vi.fn() } as never,
      { consume: vi.fn().mockResolvedValue(null) } as never,
      { hashToken: vi.fn().mockReturnValue('x') } as never,
    );

    await expect(handler.execute({ token: 'bad' })).rejects.toBeInstanceOf(
      InvalidEmailVerificationTokenError,
    );
  });
});
