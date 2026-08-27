import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Timing-safe HMAC-SHA256 hex compare for inbound webhook signatures.
 * Callers strip provider prefixes (e.g. "sha256=") before passing signatureHex.
 */
export function verifyHmacSha256Hex(
  payload: string | Buffer,
  secret: string,
  signatureHex: string,
): boolean {
  if (!secret || !signatureHex) {
    return false;
  }
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signatureHex.trim().toLowerCase(), 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export class WebhookTimestampStaleError extends Error {
  constructor(message = 'Webhook timestamp outside allowed skew.') {
    super(message);
    this.name = 'WebhookTimestampStaleError';
  }
}

/** Replay window: reject events older/newer than skewSec (default 5 minutes). */
export function assertWebhookTimestampFresh(
  timestampSec: number,
  options?: { readonly nowSec?: number; readonly skewSec?: number },
): void {
  if (!Number.isFinite(timestampSec)) {
    throw new WebhookTimestampStaleError('Webhook timestamp is invalid.');
  }
  const nowSec = options?.nowSec ?? Math.floor(Date.now() / 1000);
  const skewSec = options?.skewSec ?? 300;
  if (Math.abs(nowSec - timestampSec) > skewSec) {
    throw new WebhookTimestampStaleError();
  }
}
