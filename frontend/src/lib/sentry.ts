import type { ErrorEvent, EventHint } from '@sentry/core';

/**
 * Client/server shared scrubber for @sentry/nextjs (mirrors backend sentry-scrub.ts).
 */
const SENSITIVE_KEY =
  /pass(word|wd)?|secret|token|authorization|cookie|api[_-]?key|access[_-]?key|private[_-]?key|refresh|card|cvv|cvc|pan|pin|ssn|bearer/i;

function scrubRecord(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubRecord(item, depth + 1));
  }
  if (typeof value !== 'object') {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[Filtered]' : scrubRecord(nested, depth + 1);
  }
  return out;
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  const next = { ...event } as ErrorEvent;

  if (next.request && typeof next.request === 'object') {
    const request = { ...next.request };
    if (request.headers) {
      request.headers = scrubRecord(request.headers) as typeof request.headers;
    }
    if (request.data) {
      request.data = scrubRecord(request.data);
    }
    if (request.cookies) {
      request.cookies = { filtered: '[Filtered]' };
    }
    if (request.query_string) {
      request.query_string = scrubRecord(request.query_string) as typeof request.query_string;
    }
    next.request = request;
  }

  if (next.extra) {
    next.extra = scrubRecord(next.extra) as typeof next.extra;
  }
  if (next.contexts) {
    next.contexts = scrubRecord(next.contexts) as typeof next.contexts;
  }
  if (next.user && typeof next.user === 'object') {
    const user = { ...next.user };
    delete user.email;
    delete user.ip_address;
    next.user = user;
  }

  return next;
}

export function sentryInitOptions(): {
  dsn: string;
  environment: string;
  release?: string;
  sendDefaultPii: false;
  tracesSampleRate: number;
  beforeSend: (event: ErrorEvent, hint: EventHint) => ErrorEvent | null;
} | null {
  const dsn =
    process.env['NEXT_PUBLIC_SENTRY_DSN']?.trim() || process.env['SENTRY_DSN']?.trim() || '';
  if (!dsn) {
    return null;
  }
  const release = process.env['SENTRY_RELEASE']?.trim();
  return {
    dsn,
    environment:
      process.env['SENTRY_ENVIRONMENT']?.trim() || process.env['NODE_ENV'] || 'development',
    ...(release ? { release } : {}),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event: ErrorEvent, _hint: EventHint) {
      return scrubSentryEvent(event);
    },
  };
}
