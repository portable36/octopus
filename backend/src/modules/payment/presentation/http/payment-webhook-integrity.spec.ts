import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  assertPaymentWebhookIntegrity,
  parseWebhookTimestampSec,
} from './payment-webhook-integrity';

describe('payment webhook integrity', () => {
  it('parses unix and ISO timestamps', () => {
    expect(parseWebhookTimestampSec(1_700_000_000)).toBe(1_700_000_000);
    expect(parseWebhookTimestampSec('1700000000000')).toBe(1_700_000_000);
    expect(parseWebhookTimestampSec('2024-01-01T00:00:00.000Z')).toBe(
      Math.floor(Date.parse('2024-01-01T00:00:00.000Z') / 1000),
    );
  });

  it('allows unsigned IPN when no secret is configured', () => {
    expect(() =>
      assertPaymentWebhookIntegrity({
        rawBody: '{}',
        enforceWhenSecretConfigured: true,
      }),
    ).not.toThrow();
  });

  it('rejects missing or bad HMAC when secret is configured for IPN', () => {
    const secret = 'ipn-secret';
    expect(() =>
      assertPaymentWebhookIntegrity({
        rawBody: '{"a":1}',
        hmacSecret: secret,
        enforceWhenSecretConfigured: true,
      }),
    ).toThrow(UnauthorizedException);

    const good = createHmac('sha256', secret).update('{"a":1}').digest('hex');
    expect(() =>
      assertPaymentWebhookIntegrity({
        rawBody: '{"a":1}',
        hmacSecret: secret,
        signatureHex: `sha256=${good}`,
        enforceWhenSecretConfigured: true,
      }),
    ).not.toThrow();
  });

  it('does not enforce HMAC on browser redirects even when secret exists', () => {
    expect(() =>
      assertPaymentWebhookIntegrity({
        rawBody: '{}',
        hmacSecret: 'secret',
        enforceWhenSecretConfigured: false,
      }),
    ).not.toThrow();
  });
});
