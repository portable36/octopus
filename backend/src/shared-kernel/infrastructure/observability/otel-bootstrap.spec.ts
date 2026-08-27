import { describe, expect, it } from 'vitest';
import { redactRedisStatement } from './otel-bootstrap';
import { activeOtelTraceId } from './otel-trace-id';

describe('activeOtelTraceId', () => {
  it('returns undefined when no active span (SDK off in unit tests)', () => {
    expect(activeOtelTraceId()).toBeUndefined();
  });
});

describe('redactRedisStatement', () => {
  it('strips AUTH credentials', () => {
    expect(redactRedisStatement('auth', ['secret-password'])).toBe('AUTH');
  });

  it('truncates long values and keeps short keys', () => {
    expect(redactRedisStatement('get', ['cart:abc'])).toBe('GET cart:abc');
    const long = 'x'.repeat(80);
    expect(redactRedisStatement('set', ['k', long])).toBe(`SET k ${'x'.repeat(24)}…`);
  });
});
