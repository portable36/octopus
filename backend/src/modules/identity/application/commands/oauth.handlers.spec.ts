import { describe, expect, it, vi } from 'vitest';
import { CompleteOAuthHandler } from './oauth.handlers';

describe('CompleteOAuthHandler', () => {
  it('creates a session for mock OAuth callback', async () => {
    const saved: Array<{ email: { value: string }; emailVerified: boolean }> = [];
    const users = {
      findByEmail: vi.fn().mockResolvedValue(null),
      save: vi.fn(async (user: { email: { value: string }; emailVerified: boolean }) => {
        saved.push(user);
      }),
    };
    const passwordHasher = {
      hash: vi.fn().mockResolvedValue('hashed'),
    };
    const authSession = {
      issueSession: vi.fn().mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresInSeconds: 900,
        user: {
          userId: 'u1',
          email: 'oauth-google-mock-user@octopus.local',
          roles: ['CUSTOMER'],
          mfaEnabled: false,
          emailVerified: true,
        },
      }),
    };
    const stateStore = {
      consume: vi.fn().mockResolvedValue({
        provider: 'google',
        expiresAt: new Date(Date.now() + 60_000),
      }),
    };
    const oauth = {
      exchangeAuthorizationCode: vi.fn().mockResolvedValue({
        provider: 'google',
        subject: 'mock-user',
        email: 'oauth-google-mock-user@octopus.local',
        name: 'OAuth google',
      }),
    };

    const handler = new CompleteOAuthHandler(
      oauth as never,
      stateStore as never,
      users as never,
      passwordHasher as never,
      authSession as never,
    );

    const session = await handler.execute({
      provider: 'google',
      code: 'mock-oauth-code',
      state: 'state-1',
    });

    expect(session.accessToken).toBe('access');
    expect(saved[0]?.email.value).toBe('oauth-google-mock-user@octopus.local');
    expect(saved[0]?.emailVerified).toBe(true);
    expect(oauth.exchangeAuthorizationCode).toHaveBeenCalledWith('google', 'mock-oauth-code');
  });
});
