import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, generateTotpSecret, verifyTotp } from './totp';

describe('totp', () => {
  it('round-trips base32', () => {
    const raw = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(base32Decode(base32Encode(raw)).equals(raw)).toBe(true);
  });

  it('generates a non-empty secret', () => {
    expect(generateTotpSecret().length).toBeGreaterThan(10);
  });

  it('verifies a known counter code (RFC 6238-style)', () => {
    const secretAscii = Buffer.from('12345678901234567890', 'ascii');
    const secret = base32Encode(secretAscii);
    const step = 30;
    const nowSec = 59;
    const counter = Math.floor(nowSec / step);
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter));
    const digest = createHmac('sha1', secretAscii).update(buf).digest();
    const offset = digest[digest.length - 1]! & 0x0f;
    const intCode =
      ((digest[offset]! & 0x7f) << 24) |
      ((digest[offset + 1]! & 0xff) << 16) |
      ((digest[offset + 2]! & 0xff) << 8) |
      (digest[offset + 3]! & 0xff);
    const code = String(intCode % 1_000_000).padStart(6, '0');
    expect(verifyTotp(secret, code, { nowSec, window: 0 })).toBe(true);
    expect(verifyTotp(secret, '000000', { nowSec, window: 0 })).toBe(false);
  });
});
