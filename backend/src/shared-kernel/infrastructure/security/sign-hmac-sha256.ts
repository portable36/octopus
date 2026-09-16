import { createHmac } from 'node:crypto';

/** HMAC-SHA256 hex digest for outbound webhook signing (pair with verifyHmacSha256Hex). */
export function signHmacSha256Hex(payload: string | Buffer, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}
