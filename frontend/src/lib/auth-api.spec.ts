import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshSession } from './auth-api';

describe('auth session transport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shares concurrent refresh requests and sends the refresh cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: 'access-token',
        expiresInSeconds: 900,
        user: {
          userId: 'user-1',
          email: 'customer@example.com',
          roles: ['CUSTOMER'],
          mfaEnabled: false,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

    expect(first.accessToken).toBe('access-token');
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
    });
  });
});
