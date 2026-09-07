import { describe, expect, it, vi } from 'vitest';
import { recordRedisCommandDuration } from './redis-metrics';
import { getQueueMetricsSnapshot, registerBullmqQueueMetrics } from './queue-metrics';

describe('recordRedisCommandDuration', () => {
  it('does not throw when MeterProvider is the global noop', () => {
    expect(() => recordRedisCommandDuration('get', 1.5)).not.toThrow();
  });
});

describe('registerBullmqQueueMetrics', () => {
  it('does not throw when registering an empty set', () => {
    expect(() => registerBullmqQueueMetrics([])).not.toThrow();
  });

  it('captures queue metrics snapshot from registered queues', async () => {
    const mockQueue = {
      getJobCounts: vi.fn().mockResolvedValue({
        waiting: 5,
        delayed: 1,
        active: 2,
        failed: 0,
        completed: 100,
        paused: 0,
      }),
      getJobs: vi.fn().mockResolvedValue([{ id: '1', timestamp: Date.now() - 2500 }]),
      isPaused: vi.fn().mockResolvedValue(false),
    };

    registerBullmqQueueMetrics([{ name: 'test-orders-queue', queue: mockQueue as never }]);

    const snapshots = await getQueueMetricsSnapshot();
    const testQueue = snapshots.find((q) => q.name === 'test-orders-queue');
    expect(testQueue).toBeDefined();
    expect(testQueue?.waiting).toBe(5);
    expect(testQueue?.active).toBe(2);
    expect(testQueue?.failed).toBe(0);
    expect(testQueue?.status).toBe('healthy');
    expect(testQueue?.lagMs).toBeGreaterThan(0);
  });
});
