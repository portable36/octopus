/**
 * Shared sensitive-key scrubbing for Sentry events (backend + frontend).
 * Keep in sync across packages — no shared runtime package yet.
 */
const SENSITIVE_KEY =
  /pass(word|wd)?|secret|token|authorization|cookie|api[_-]?key|access[_-]?key|private[_-]?key|refresh|card|cvv|cvc|pan|pin|ssn|bearer/i;

export function scrubRecord(value: unknown, depth = 0): unknown {
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

/** Sentry beforeSend-compatible scrubber (works with Event-like objects). */
export function scrubSentryEvent<T extends Record<string, unknown>>(event: T): T {
  const next = { ...event } as Record<string, unknown>;

  if (next['request'] && typeof next['request'] === 'object') {
    const request = { ...(next['request'] as Record<string, unknown>) };
    if (request['headers']) {
      request['headers'] = scrubRecord(request['headers']);
    }
    if (request['data']) {
      request['data'] = scrubRecord(request['data']);
    }
    if (request['cookies']) {
      request['cookies'] = '[Filtered]';
    }
    if (request['query_string']) {
      request['query_string'] = scrubRecord(request['query_string']);
    }
    next['request'] = request;
  }

  if (next['extra']) {
    next['extra'] = scrubRecord(next['extra']);
  }
  if (next['contexts']) {
    next['contexts'] = scrubRecord(next['contexts']);
  }
  if (next['user'] && typeof next['user'] === 'object') {
    const user = { ...(next['user'] as Record<string, unknown>) };
    delete user['email'];
    delete user['ip_address'];
    next['user'] = user;
  }

  return next as T;
}
