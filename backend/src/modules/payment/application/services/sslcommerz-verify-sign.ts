import { createHash, timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

/** PHP-compatible MD5 hex digest (UTF-8). */
export function md5Hex(input: string): string {
  return createHash('md5').update(input, 'utf8').digest('hex');
}

/**
 * SSLCommerz IPN `verify_sign` check (provider-native MD5).
 *
 * Algorithm (official docs):
 * 1. Split `verify_key` by comma → field names present in the POST body
 * 2. Append `store_passwd` = MD5(store password)
 * 3. Sort keys alphabetically
 * 4. Join `key=value` with `&`, MD5 the string, compare to `verify_sign` (timing-safe)
 */
export function verifySslCommerzSign(input: {
  readonly payload: Record<string, unknown>;
  readonly storePasswd: string;
}): boolean {
  const verifySign = String(input.payload['verify_sign'] ?? '')
    .trim()
    .toLowerCase();
  const verifyKey = String(input.payload['verify_key'] ?? '').trim();
  const storePasswd = input.storePasswd.trim();
  if (!verifySign || !verifyKey || !storePasswd) {
    return false;
  }

  const keys = verifyKey
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  if (keys.length === 0) {
    return false;
  }

  const values = new Map<string, string>();
  for (const key of keys) {
    const raw = input.payload[key];
    values.set(key, raw === undefined || raw === null ? '' : String(raw));
  }
  values.set('store_passwd', md5Hex(storePasswd));

  const sortedKeys = [...values.keys()].sort((a, b) => a.localeCompare(b));
  const hashString = sortedKeys.map((key) => `${key}=${values.get(key) ?? ''}`).join('&');
  const expected = md5Hex(hashString);

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(verifySign, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Enforce SSLCommerz verify_sign when store password is configured (live/sandbox credentials).
 * Skips when `storePasswd` is unset so local mock IPNs without signs still work.
 */
export function assertSslCommerzIpnSign(input: {
  readonly payload: Record<string, unknown>;
  readonly storePasswd?: string | undefined;
}): void {
  const storePasswd = input.storePasswd?.trim();
  if (!storePasswd) {
    return;
  }
  if (!verifySslCommerzSign({ payload: input.payload, storePasswd })) {
    throw new UnauthorizedException({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      detail: 'Invalid SSLCommerz verify_sign.',
      code: 'SSLCOMMERZ_VERIFY_SIGN_INVALID',
    });
  }
}
