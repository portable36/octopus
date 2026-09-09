import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { VerifyOtpHandler } from './otp.handlers';

function hash(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

describe('VerifyOtpHandler', () => {
  it('issues a session for a valid mock OTP and creates the user', async () => {
    const code = '123456';
    const phone = '+8801712345678';
    const saved: Array<{ email: { value: string } }> = [];

    const users = {
      findByEmail: vi.fn().mockResolvedValue(null),
      save: vi.fn(async (user: { email: { value: string } }) => {
        saved.push(user);
      }),
    };
    const otpStore = {
      consume: vi.fn().mockResolvedValue({
        codeHash: hash(code),
        expiresAt: new Date(Date.now() + 60_000),
      }),
    };
    const passwordHasher = { hash: vi.fn().mockResolvedValue('hashed') };
    const authSession = {
      hashToken: (value: string) => hash(value),
      issueSession: vi.fn().mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresInSeconds: 900,
        user: {
          userId: 'u1',
          email: 'phone-8801712345678@octopus.local',
          roles: ['CUSTOMER'],
          mfaEnabled: false,
          emailVerified: true,
        },
      }),
    };
    const rateLimiter = {
      assertAllowed: vi.fn().mockResolvedValue(undefined),
      recordFailure: vi.fn().mockResolvedValue(undefined),
    };

    const handler = new VerifyOtpHandler(
      otpStore as never,
      users as never,
      passwordHasher as never,
      authSession as never,
      rateLimiter as never,
    );

    const session = await handler.execute({
      phone,
      code,
      rateLimitKey: 'otp-verify:test',
    });

    expect(session.accessToken).toBe('access');
    expect(saved[0]?.email.value).toBe('phone-8801712345678@octopus.local');
    expect(authSession.issueSession).toHaveBeenCalled();
  });
});
