import { describe, expect, it } from 'vitest';
import { recordHttpServerRequest } from './http-metrics';

describe('recordHttpServerRequest', () => {
  it('does not throw when MeterProvider is the global noop', () => {
    expect(() =>
      recordHttpServerRequest({
        method: 'GET',
        route: '/health',
        statusCode: 200,
        durationMs: 12.5,
      }),
    ).not.toThrow();
  });

  it('accepts 5xx for error-rate attribution', () => {
    expect(() =>
      recordHttpServerRequest({
        method: 'POST',
        route: '/api/v1/checkout',
        statusCode: 500,
        durationMs: 3,
      }),
    ).not.toThrow();
  });
});
