import { describe, expect, it } from 'vitest';
import { redactSecrets } from './redact-secrets';

describe('redactSecrets', () => {
  it('redacts secret-looking keys and keeps others', () => {
    expect(
      redactSecrets({
        email: 'a@b.c',
        password: 'hunter2',
        nested: { accessToken: 'abc', count: 1 },
      }),
    ).toEqual({
      email: 'a@b.c',
      password: '[REDACTED]',
      nested: { accessToken: '[REDACTED]', count: 1 },
    });
  });
});
