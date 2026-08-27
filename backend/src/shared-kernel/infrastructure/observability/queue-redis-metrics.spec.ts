import { describe, expect, it } from 'vitest';
import { recordRedisCommandDuration } from './redis-metrics';
import { registerBullmqQueueMetrics } from './queue-metrics';

describe('recordRedisCommandDuration', () => {
  it('does not throw when MeterProvider is the global noop', () => {
    expect(() => recordRedisCommandDuration('get', 1.5)).not.toThrow();
  });
});

describe('registerBullmqQueueMetrics', () => {
  it('does not throw when registering an empty set', () => {
    expect(() => registerBullmqQueueMetrics([])).not.toThrow();
  });
});
