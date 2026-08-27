import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  WebhookTimestampStaleError,
  assertWebhookTimestampFresh,
  verifyHmacSha256Hex,
} from './webhook-signature';

describe('verifyHmacSha256Hex', () => {
  it('accepts a matching signature', () => {
    const payload = '{"id":"evt_1"}';
    const secret = 'whsec_test';
    const sig = createHmac('sha256', secret).update(payload).digest('hex');
    expect(verifyHmacSha256Hex(payload, secret, sig)).toBe(true);
  });

  it('rejects a mismatched signature', () => {
    expect(verifyHmacSha256Hex('{}', 'secret', '00'.repeat(32))).toBe(false);
  });

  it('rejects empty inputs', () => {
    expect(verifyHmacSha256Hex('{}', '', 'abcd')).toBe(false);
  });
});

describe('assertWebhookTimestampFresh', () => {
  it('accepts timestamps within skew', () => {
    expect(() => assertWebhookTimestampFresh(1_000, { nowSec: 1_100, skewSec: 300 })).not.toThrow();
  });

  it('rejects stale timestamps', () => {
    expect(() => assertWebhookTimestampFresh(1_000, { nowSec: 2_000, skewSec: 300 })).toThrow(
      WebhookTimestampStaleError,
    );
  });
});
