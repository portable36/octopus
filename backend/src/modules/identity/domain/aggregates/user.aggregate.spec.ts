import { describe, expect, it } from 'vitest';
import { User } from './user.aggregate';

const FIXED_UUID = '01900000-0000-7000-8000-000000000001';

describe('User aggregate', () => {
  it('registers a new active user with a UserRegistered event', () => {
    const user = User.register('vendor@example.com', 'Vendor One');

    expect(user.status).toBe('active');
    expect(user.name).toBe('Vendor One');
    const events = user.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.eventName).toBe('UserRegistered');
  });

  it('normalizes the registration email', () => {
    const user = User.register('VENDOR@Example.COM', 'V');
    expect(user.email.value).toBe('vendor@example.com');
  });

  it('rehydrates from persistence without emitting events', () => {
    const user = User.rehydrate(FIXED_UUID, 'a@b.co', 'A', 'active');
    expect(user.status).toBe('active');
    expect(user.getUncommittedEvents()).toHaveLength(0);
  });

  it('transitions active -> suspended -> active -> deactivated', () => {
    const user = User.register('u@e.co', 'U');
    user.suspend();
    expect(user.status).toBe('suspended');
    user.reactivate();
    expect(user.status).toBe('active');
    user.deactivate();
    expect(user.status).toBe('deactivated');

    const names = user.getUncommittedEvents().map((e) => e.eventName);
    expect(names).toContain('UserSuspended');
    expect(names).toContain('UserReactivated');
    expect(names).toContain('UserDeactivated');
  });

  it('rejects suspending an already suspended user', () => {
    const user = User.register('u@e.co', 'U');
    user.suspend();
    expect(() => user.suspend()).toThrow('Invalid status transition: suspended -> suspended.');
  });

  it('rejects reactivating an active user', () => {
    const user = User.register('u@e.co', 'U');
    expect(() => user.reactivate()).toThrow('Invalid status transition: active -> active.');
  });

  it('rejects any transition out of deactivated', () => {
    const user = User.register('u@e.co', 'U');
    user.deactivate();
    expect(() => user.suspend()).toThrow('Invalid status transition: deactivated -> suspended.');
    expect(() => user.reactivate()).toThrow('Invalid status transition: deactivated -> active.');
  });

  it('clearEvents empties uncommitted events', () => {
    const user = User.register('u@e.co', 'U');
    expect(user.getUncommittedEvents().length).toBeGreaterThan(0);
    user.clearEvents();
    expect(user.getUncommittedEvents()).toHaveLength(0);
  });
});
