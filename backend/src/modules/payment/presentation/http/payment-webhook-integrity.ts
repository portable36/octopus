import { UnauthorizedException } from '@nestjs/common';
import {
  assertWebhookTimestampFresh,
  verifyHmacSha256Hex,
  WebhookTimestampStaleError,
} from '../../../../shared-kernel/infrastructure/security/webhook-signature';

/**
 * Optional IPN integrity gates using shared webhook helpers.
 * Browser return URLs typically omit signature — only enforce when a secret is configured
 * and the caller marks the request as an IPN/webhook (not a customer redirect).
 */
export function assertPaymentWebhookIntegrity(input: {
  readonly rawBody: string;
  readonly signatureHex?: string | undefined;
  readonly hmacSecret?: string | undefined;
  readonly timestampSec?: number | undefined;
  readonly enforceWhenSecretConfigured: boolean;
}): void {
  if (input.timestampSec !== undefined) {
    try {
      assertWebhookTimestampFresh(input.timestampSec);
    } catch (error) {
      if (error instanceof WebhookTimestampStaleError) {
        throw new UnauthorizedException({
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          detail: error.message,
          code: 'PAYMENT_WEBHOOK_TIMESTAMP_STALE',
        });
      }
      throw error;
    }
  }

  const secret = input.hmacSecret?.trim();
  if (!secret) {
    return;
  }
  if (!input.enforceWhenSecretConfigured) {
    return;
  }
  const signature = input.signatureHex?.replace(/^sha256=/i, '').trim();
  if (!signature || !verifyHmacSha256Hex(input.rawBody, secret, signature)) {
    throw new UnauthorizedException({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      detail: 'Invalid payment webhook signature.',
      code: 'PAYMENT_WEBHOOK_SIGNATURE_INVALID',
    });
  }
}

export function parseWebhookTimestampSec(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw > 1_000_000_000_000 ? Math.floor(raw / 1000) : raw;
  }
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined;
  }
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && /^\d+(\.\d+)?$/.test(raw.trim())) {
    return asNumber > 1_000_000_000_000 ? Math.floor(asNumber / 1000) : asNumber;
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return Math.floor(parsed / 1000);
}
