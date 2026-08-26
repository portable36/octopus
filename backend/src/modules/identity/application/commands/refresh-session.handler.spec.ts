import { describe, expect, it, vi } from 'vitest';
import { User } from '../../domain/aggregates/user.aggregate';
import { InvalidRefreshTokenError, TokenReuseDetectedError } from '../errors/identity.errors';
import { RefreshSessionHandler } from './session.handlers';

const PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$hash';

describe('RefreshSessionHandler', () => {
  it('rejects unknown refresh tokens', async () => {
    const handler = new RefreshSessionHandler(
      {
        find: vi.fn().mockResolvedValue(null),
        store: vi.fn(),
        markRevoked: vi.fn(),
        revokeFamily: vi.fn(),
        trackUserFamily: vi.fn(),
        revokeAllForUser: vi.fn(),
      },
      {
        findById: vi.fn(),
        findByEmail: vi.fn(),
        save: vi.fn(),
        existsByEmail: vi.fn(),
        listRecent: vi.fn(),
      },
      { hashToken: vi.fn().mockReturnValue('hash'), issueSession: vi.fn() } as never,
    );

    await expect(handler.execute('missing')).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });

  it('revokes the token family on reuse', async () => {
    const refreshTokenStore = {
      find: vi.fn().mockResolvedValue({
        userId: 'user-1',
        familyId: 'family-1',
        expiresAt: new Date(Date.now() + 60_000),
        status: 'revoked',
      }),
      store: vi.fn(),
      markRevoked: vi.fn(),
      revokeFamily: vi.fn(),
      trackUserFamily: vi.fn(),
      revokeAllForUser: vi.fn(),
    };

    const handler = new RefreshSessionHandler(
      refreshTokenStore,
      {
        findById: vi.fn(),
        findByEmail: vi.fn(),
        save: vi.fn(),
        existsByEmail: vi.fn(),
        listRecent: vi.fn(),
      },
      { hashToken: vi.fn().mockReturnValue('hash'), issueSession: vi.fn() } as never,
    );

    await expect(handler.execute('reused-token')).rejects.toBeInstanceOf(TokenReuseDetectedError);
    expect(refreshTokenStore.revokeFamily).toHaveBeenCalledWith('family-1');
  });

  it('rotates an active refresh token', async () => {
    const user = User.register('u@e.co', 'User', PASSWORD_HASH);
    user.activate();

    const refreshTokenStore = {
      find: vi.fn().mockResolvedValue({
        userId: user.id.value,
        familyId: 'family-1',
        expiresAt: new Date(Date.now() + 60_000),
        status: 'active',
      }),
      store: vi.fn(),
      markRevoked: vi.fn(),
      revokeFamily: vi.fn(),
      trackUserFamily: vi.fn(),
      revokeAllForUser: vi.fn(),
    };

    const issueSession = vi.fn().mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresInSeconds: 900,
      user: { userId: user.id.value, email: user.email.value, roles: user.roles },
    });

    const handler = new RefreshSessionHandler(
      refreshTokenStore,
      {
        findById: vi.fn().mockResolvedValue(user),
        findByEmail: vi.fn(),
        save: vi.fn(),
        existsByEmail: vi.fn(),
        listRecent: vi.fn(),
      },
      { hashToken: vi.fn().mockReturnValue('hash'), issueSession } as never,
    );

    const session = await handler.execute('active-token');
    expect(refreshTokenStore.markRevoked).toHaveBeenCalledWith('hash');
    expect(issueSession).toHaveBeenCalledWith(user, 'family-1');
    expect(session.accessToken).toBe('access');
  });
});
