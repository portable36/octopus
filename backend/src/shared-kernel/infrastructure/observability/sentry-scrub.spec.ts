import { describe, expect, it } from 'vitest';
import { scrubRecord, scrubSentryEvent } from './sentry-scrub';

describe('sentry-scrub', () => {
  it('redacts sensitive keys recursively', () => {
    expect(
      scrubRecord({
        orderId: 'o1',
        password: 'secret',
        nested: { refreshToken: 'abc', ok: true },
      }),
    ).toEqual({
      orderId: 'o1',
      password: '[Filtered]',
      nested: { refreshToken: '[Filtered]', ok: true },
    });
  });

  it('scrubs request headers/body and drops user email', () => {
    const scrubbed = scrubSentryEvent({
      request: {
        headers: { authorization: 'Bearer x', 'x-request-id': 'r1' },
        data: { password: 'p', cartId: 'c1' },
        cookies: 'a=b',
      },
      user: { id: 'u1', email: 'a@b.c', ip_address: '1.1.1.1' },
      extra: { apiKey: 'k', vendorId: 'v1' },
    });

    expect(scrubbed.request).toEqual({
      headers: { authorization: '[Filtered]', 'x-request-id': 'r1' },
      data: { password: '[Filtered]', cartId: 'c1' },
      cookies: '[Filtered]',
    });
    expect(scrubbed.user).toEqual({ id: 'u1' });
    expect(scrubbed.extra).toEqual({ apiKey: '[Filtered]', vendorId: 'v1' });
  });
});
