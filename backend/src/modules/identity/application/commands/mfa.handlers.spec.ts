import { describe, expect, it, vi } from 'vitest';
import { User } from '../../domain/aggregates/user.aggregate';
import { generateTotpSecret, totpCodeAt } from '../../domain/services/totp';
import { InvalidMfaCodeError, MfaAlreadyEnabledError } from '../errors/identity.errors';
import { MfaHandlers } from './mfa.handlers';

describe('MfaHandlers', () => {
  const secrets = {
    seal: vi.fn((s: string) => `sealed:${s}`),
    open: vi.fn((c: string) => c.replace(/^sealed:/, '')),
  };

  it('reuses the active setup secret for concurrent setup requests', async () => {
    const user = User.register('a@b.co', 'A', 'hash');
    user.activate();
    const activeSecret = 'JBSWY3DPEHPK3PXP';
    const putIfAbsent = vi.fn().mockResolvedValue(activeSecret);
    const handlers = new MfaHandlers(
      { findById: vi.fn().mockResolvedValue(user) } as never,
      { verify: vi.fn(), hash: vi.fn() } as never,
      { create: vi.fn(), consume: vi.fn() } as never,
      { putIfAbsent, put: vi.fn(), take: vi.fn() } as never,
      secrets as never,
      { issueSession: vi.fn() } as never,
      null,
    );

    const result = await handlers.beginSetup(user.id.value);

    expect(result.secret).toBe(activeSecret);
    expect(result.otpauthUrl).toContain(`secret=${activeSecret}`);
    expect(putIfAbsent).toHaveBeenCalledOnce();
  });

  it('confirms enable after a valid TOTP', async () => {
    const user = User.register('a@b.co', 'A', 'hash');
    user.activate();
    const users = {
      findById: vi.fn().mockResolvedValue(user),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const secret = generateTotpSecret();
    const setups = {
      put: vi.fn(),
      take: vi.fn().mockResolvedValue(secret),
    };
    const handlers = new MfaHandlers(
      users as never,
      { verify: vi.fn(), hash: vi.fn() } as never,
      { create: vi.fn(), consume: vi.fn() } as never,
      setups as never,
      secrets as never,
      { issueSession: vi.fn() } as never,
      null,
    );
    await handlers.confirmEnable(user.id.value, totpCodeAt(secret));
    expect(user.mfaEnabled).toBe(true);
    expect(user.mfaSecretCipher).toBeTruthy();
    expect(users.save).toHaveBeenCalled();
  });

  it('rejects confirm when MFA already enabled', async () => {
    const user = User.register('a@b.co', 'A', 'hash');
    user.activate();
    user.enableMfa('cipher');
    const handlers = new MfaHandlers(
      { findById: vi.fn().mockResolvedValue(user), save: vi.fn() } as never,
      { verify: vi.fn(), hash: vi.fn() } as never,
      { create: vi.fn(), consume: vi.fn() } as never,
      { put: vi.fn(), take: vi.fn() } as never,
      secrets as never,
      { issueSession: vi.fn() } as never,
      null,
    );
    await expect(handlers.confirmEnable(user.id.value, '123456')).rejects.toBeInstanceOf(
      MfaAlreadyEnabledError,
    );
  });

  it('rejects bad codes on confirm', async () => {
    const user = User.register('a@b.co', 'A', 'hash');
    user.activate();
    const secret = generateTotpSecret();
    const setups = {
      put: vi.fn(),
      take: vi.fn().mockResolvedValue(secret),
    };
    const handlers = new MfaHandlers(
      { findById: vi.fn().mockResolvedValue(user), save: vi.fn() } as never,
      { verify: vi.fn(), hash: vi.fn() } as never,
      { create: vi.fn(), consume: vi.fn() } as never,
      setups as never,
      secrets as never,
      { issueSession: vi.fn() } as never,
      null,
    );
    await expect(handlers.confirmEnable(user.id.value, 'abcdef')).rejects.toBeInstanceOf(
      InvalidMfaCodeError,
    );
    expect(setups.put).toHaveBeenCalled();
  });
});
