import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32 (no padding) for authenticator secrets. */
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input
    .replace(/=+$/u, '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/gu, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) {
      throw new Error('Invalid base32 secret.');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(byteLength = 20): string {
  return base32Encode(randomBytes(byteLength));
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(buf).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const code =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

/** Current (or time-skewed) TOTP code — for tests and enrollment confirmation helpers. */
export function totpCodeAt(
  secretBase32: string,
  nowSec = Math.floor(Date.now() / 1000),
  stepSec = 30,
): string {
  return hotp(base32Decode(secretBase32), Math.floor(nowSec / stepSec));
}

export function verifyTotp(
  secretBase32: string,
  code: string,
  options?: { readonly nowSec?: number; readonly window?: number; readonly stepSec?: number },
): boolean {
  const normalized = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }
  const secret = base32Decode(secretBase32);
  const step = options?.stepSec ?? 30;
  const window = options?.window ?? 1;
  const counter = Math.floor((options?.nowSec ?? Math.floor(Date.now() / 1000)) / step);
  const expectedBuf = Buffer.from(normalized, 'utf8');
  for (let w = -window; w <= window; w++) {
    const candidate = Buffer.from(hotp(secret, counter + w), 'utf8');
    if (candidate.length === expectedBuf.length && timingSafeEqual(candidate, expectedBuf)) {
      return true;
    }
  }
  return false;
}

export function buildOtpAuthUrl(input: {
  readonly secretBase32: string;
  readonly accountName: string;
  readonly issuer?: string;
}): string {
  const issuer = input.issuer ?? 'Octopus';
  const label = encodeURIComponent(`${issuer}:${input.accountName}`);
  const params = new URLSearchParams({
    secret: input.secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
