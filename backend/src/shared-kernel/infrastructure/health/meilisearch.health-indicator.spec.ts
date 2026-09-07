import { describe, expect, it, vi } from 'vitest';
import { MeilisearchHealthIndicator } from './meilisearch.health-indicator';

describe('MeilisearchHealthIndicator', () => {
  it('returns disabled status when meilisearch host is not configured', async () => {
    const indicator = new MeilisearchHealthIndicator();
    const result = await indicator.isHealthy('meilisearch');
    expect(result['meilisearch']?.status).toBe('up');
    expect((result['meilisearch'] as { state?: string } | undefined)?.state).toBe('disabled');

    const pingRes = await indicator.ping('meilisearch');
    expect(pingRes.status).toBe('disabled');
  });

  it('measures latency and returns up when Meilisearch responds healthy', async () => {
    const config = {
      meilisearchHost: 'http://localhost:7700',
      meilisearchApiKey: 'test-key',
    };
    const indicator = new MeilisearchHealthIndicator(config as never);
    // Mock the internal client isHealthy
    (indicator as unknown as { client: { isHealthy: () => Promise<boolean> } }).client = {
      isHealthy: vi.fn().mockResolvedValue(true),
    };

    const result = await indicator.isHealthy('meilisearch');
    expect(result['meilisearch']?.status).toBe('up');
    expect(typeof (result['meilisearch'] as { latencyMs?: number } | undefined)?.latencyMs).toBe(
      'number',
    );

    const ping = await indicator.ping('meilisearch');
    expect(ping.status).toBe('up');
    expect(typeof ping.latencyMs).toBe('number');
  });

  it('returns down with error message when ping fails', async () => {
    const config = {
      meilisearchHost: 'http://localhost:7700',
      meilisearchApiKey: 'test-key',
    };
    const indicator = new MeilisearchHealthIndicator(config as never);
    (indicator as unknown as { client: { isHealthy: () => Promise<boolean> } }).client = {
      isHealthy: vi.fn().mockRejectedValue(new Error('Connection refused')),
    };

    const ping = await indicator.ping('meilisearch');
    expect(ping.status).toBe('down');
    expect(ping.message).toBe('Connection refused');
    expect(typeof ping.latencyMs).toBe('number');
  });
});
