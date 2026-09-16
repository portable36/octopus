import { describe, expect, it, vi } from 'vitest';
import { AnalyticsProcessor, resolveAnalyticsEventName } from './analytics.processor';

describe('resolveAnalyticsEventName', () => {
  it('prefers payload eventName', () => {
    expect(
      resolveAnalyticsEventName({
        outboxId: '1',
        source: 'order',
        aggregateId: 'a',
        eventType: 'AnalyticsTrack',
        payload: { eventName: 'ProductViewed' },
        eventVersion: 1,
      }),
    ).toBe('ProductViewed');
  });

  it('strips Analytics prefix when no payload name', () => {
    expect(
      resolveAnalyticsEventName({
        outboxId: '1',
        source: 'order',
        aggregateId: 'a',
        eventType: 'AnalyticsAddToCart',
        payload: {},
        eventVersion: 1,
      }),
    ).toBe('AddToCart');
  });
});

describe('AnalyticsProcessor', () => {
  it('marks delivery after recording', async () => {
    const redis = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => 'OK'),
    };
    const processor = new AnalyticsProcessor(redis as never);
    await processor.handle({
      outboxId: 'ob-a1',
      source: 'order',
      aggregateId: 'p1',
      eventType: 'AnalyticsTrack',
      payload: { eventName: 'SearchPerformed' },
      eventVersion: 1,
    });
    expect(redis.set).toHaveBeenCalled();
  });

  it('skips when already processed', async () => {
    const redis = {
      get: vi.fn(async () => '1'),
      set: vi.fn(async () => 'OK'),
    };
    const processor = new AnalyticsProcessor(redis as never);
    await processor.handle({
      outboxId: 'ob-a2',
      source: 'order',
      aggregateId: 'p1',
      eventType: 'AnalyticsTrack',
      payload: { eventName: 'SearchPerformed' },
      eventVersion: 1,
    });
    expect(redis.set).not.toHaveBeenCalled();
  });
});
