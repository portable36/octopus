import { describe, expect, it } from 'vitest';
import { EmailAddress } from './email-address.value-object';

describe('EmailAddress', () => {
  it('accepts and normalizes valid emails', () => {
    const email = EmailAddress.create('  Vendor@Example.COM ');
    expect(email.value).toBe('vendor@example.com');
  });

  it('rejects emails without an @', () => {
    expect(() => EmailAddress.create('not-an-email')).toThrow('Invalid email address');
  });

  it('rejects emails without a TLD', () => {
    expect(() => EmailAddress.create('user@localhost')).toThrow('Invalid email address');
  });

  it('compares by value equality', () => {
    const a = EmailAddress.create('a@b.co');
    const b = EmailAddress.create('A@B.CO');
    expect(a.equals(b)).toBe(true);
  });
});
