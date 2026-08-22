import { describe, expect, it } from 'vitest';
import {
  AccountDisabledError,
  AccountLockedError,
  AccountNotActiveError,
} from '../errors/user.errors';
import { User } from './user.aggregate';

const FIXED_UUID = '01900000-0000-7000-8000-000000000001';
const PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$hash';

describe('User aggregate', () => {
  it('registers a pending user with a UserRegistered event', () => {
    const user = User.register('vendor@example.com', 'Vendor One', PASSWORD_HASH);

    expect(user.status).toBe('pending');
    expect(user.name).toBe('Vendor One');
    const events = user.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.eventName).toBe('UserRegistered');
  });

  it('activates a pending user', () => {
    const user = User.register('vendor@example.com', 'Vendor One', PASSWORD_HASH);
    user.activate();
    expect(user.status).toBe('active');
    expect(user.getUncommittedEvents().map((event) => event.eventName)).toContain('UserActivated');
  });

  it('normalizes the registration email', () => {
    const user = User.register('VENDOR@Example.COM', 'V', PASSWORD_HASH);
    expect(user.email.value).toBe('vendor@example.com');
  });

  it('rehydrates from persistence without emitting events', () => {
    const user = User.rehydrate(
      FIXED_UUID,
      'a@b.co',
      'A',
      PASSWORD_HASH,
      'active',
      ['CUSTOMER'],
      0,
      null,
    );
    expect(user.status).toBe('active');
    expect(user.getUncommittedEvents()).toHaveLength(0);
  });

  it('transitions active -> locked -> active -> disabled', () => {
    const user = User.register('u@e.co', 'U', PASSWORD_HASH);
    user.activate();
    user.lock(new Date(Date.now() + 60_000));
    expect(user.status).toBe('locked');
    user.unlock();
    expect(user.status).toBe('active');
    user.disable();
    expect(user.status).toBe('disabled');

    const names = user.getUncommittedEvents().map((event) => event.eventName);
    expect(names).toContain('UserLocked');
    expect(names).toContain('UserUnlocked');
    expect(names).toContain('UserDisabled');
  });

  it('locks the account after repeated failed logins', () => {
    const user = User.register('u@e.co', 'U', PASSWORD_HASH);
    user.activate();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      user.recordFailedLogin(5, 60_000);
    }
    expect(user.status).toBe('active');
    expect(user.failedLoginAttempts).toBe(4);

    user.recordFailedLogin(5, 60_000);
    expect(user.status).toBe('locked');
    expect(user.lockedUntil).not.toBeNull();
  });

  it('rejects authenticating a pending user', () => {
    const user = User.register('u@e.co', 'U', PASSWORD_HASH);
    expect(() => user.assertCanAuthenticate()).toThrow(AccountNotActiveError);
  });

  it('rejects authenticating a disabled user', () => {
    const user = User.register('u@e.co', 'U', PASSWORD_HASH);
    user.activate();
    user.disable();
    expect(() => user.assertCanAuthenticate()).toThrow(AccountDisabledError);
  });

  it('rejects authenticating a locked user before lock expiry', () => {
    const user = User.register('u@e.co', 'U', PASSWORD_HASH);
    user.activate();
    user.lock(new Date(Date.now() + 60_000));
    expect(() => user.assertCanAuthenticate()).toThrow(AccountLockedError);
  });

  it('changes password and emits PasswordChanged', () => {
    const user = User.register('u@e.co', 'U', PASSWORD_HASH);
    user.changePassword('new-hash');
    expect(user.passwordHash).toBe('new-hash');
    expect(user.getUncommittedEvents().map((event) => event.eventName)).toContain(
      'PasswordChanged',
    );
  });

  it('clearEvents empties uncommitted events', () => {
    const user = User.register('u@e.co', 'U', PASSWORD_HASH);
    expect(user.getUncommittedEvents().length).toBeGreaterThan(0);
    user.clearEvents();
    expect(user.getUncommittedEvents()).toHaveLength(0);
  });
});
