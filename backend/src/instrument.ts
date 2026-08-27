import * as Sentry from '@sentry/nestjs';
import { scrubSentryEvent } from './shared-kernel/infrastructure/observability/sentry-scrub';

/**
 * Opt-in Sentry bootstrap. Import this before other app modules in main.ts.
 * No-ops when SENTRY_DSN is unset.
 */
const dsn = process.env['SENTRY_DSN']?.trim();
const release = process.env['SENTRY_RELEASE']?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env['SENTRY_ENVIRONMENT']?.trim() || process.env['NODE_ENV'] || 'development',
    ...(release ? { release } : {}),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      return scrubSentryEvent(
        event as unknown as Record<string, unknown>,
      ) as unknown as typeof event;
    },
  });
}

export function isSentryEnabled(): boolean {
  return Boolean(dsn);
}

export async function flushSentry(): Promise<void> {
  if (!dsn) {
    return;
  }
  await Sentry.flush(2000);
}
