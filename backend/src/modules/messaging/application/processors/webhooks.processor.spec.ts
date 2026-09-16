import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebhooksProcessor } from './webhooks.processor';

function createProcessor(overrides: {
  urls?: string[];
  secret?: string | undefined;
  allowHosts?: string[];
  fetchImpl?: typeof fetch;
} = {}) {
  const redis = {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
  };
  const config = {
    webhookOutboundUrls: overrides.urls ?? [],
    webhookOutboundSecret: overrides.secret,
    outboundUrlAllowlistHosts: overrides.allowHosts ?? ['hooks.example.com'],
  };
  const processor = new WebhooksProcessor(redis as never, config as never);
  if (overrides.fetchImpl) {
    vi.stubGlobal('fetch', overrides.fetchImpl);
  }
  return { processor, redis, config };
}

describe('WebhooksProcessor', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('logs stub when no outbound URLs are configured', async () => {
    const { processor, redis } = createProcessor({ urls: [] });
    await processor.handle({
      outboxId: 'ob-1',
      source: 'order',
      aggregateId: 'ord-1',
      eventType: 'WebhookDeliver',
      payload: { eventName: 'OrderPaid', orderId: 'ord-1' },
      eventVersion: 1,
    });
    expect(redis.set).toHaveBeenCalled();
  });

  it('POSTs signed JSON to configured URLs', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }));
    const { processor } = createProcessor({
      urls: ['https://hooks.example.com/octopus'],
      secret: 'whsec_test',
      fetchImpl: fetchImpl as never,
    });

    await processor.handle({
      outboxId: 'ob-2',
      source: 'order',
      aggregateId: 'ord-2',
      eventType: 'WebhookDeliver',
      payload: { eventName: 'OrderPaid' },
      eventVersion: 1,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://hooks.example.com/octopus');
    expect(init.method).toBe('POST');
    expect(init.headers['x-octopus-signature']).toMatch(/^[a-f0-9]{64}$/);
    expect(init.headers['x-octopus-event']).toBe('OrderPaid');
    expect(JSON.parse(init.body as string).aggregateId).toBe('ord-2');
  });

  it('rejects non-allowlisted hosts', async () => {
    const { processor, redis } = createProcessor({
      urls: ['https://evil.example/hook'],
      secret: 'whsec_test',
      allowHosts: ['hooks.example.com'],
    });

    await expect(
      processor.handle({
        outboxId: 'ob-3',
        source: 'order',
        aggregateId: 'ord-3',
        eventType: 'WebhookDeliver',
        payload: {},
        eventVersion: 1,
      }),
    ).rejects.toThrow(/allowlist|not allowlisted/i);
    expect(redis.set).not.toHaveBeenCalled();
  });
});
