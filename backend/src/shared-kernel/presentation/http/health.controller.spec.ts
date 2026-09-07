import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const createMockServices = () => {
    const healthService = {
      check: vi.fn().mockImplementation((indicators: Array<() => unknown>) => {
        return Promise.all(indicators.map((fn) => fn()));
      }),
    };
    const database = {
      isHealthy: vi.fn().mockResolvedValue({
        database: { status: 'up', latencyMs: 3 },
      }),
    };
    const redis = {
      isHealthy: vi.fn().mockResolvedValue({
        redis: { status: 'up', latencyMs: 2, statusName: 'ready' },
      }),
    };
    const meilisearch = {
      isHealthy: vi.fn().mockResolvedValue({
        meilisearch: { status: 'up', latencyMs: 5, host: 'http://localhost:7700' },
      }),
      ping: vi.fn().mockResolvedValue({
        status: 'up' as const,
        latencyMs: 5,
        host: 'http://localhost:7700',
      }),
    };
    const disk = {
      checkStorage: vi.fn().mockResolvedValue({ disk: { status: 'up' } }),
    };
    const memory = {
      checkHeap: vi.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
    };

    const controller = new HealthController(
      healthService as never,
      database as never,
      redis as never,
      meilisearch as never,
      disk as never,
      memory as never,
    );

    return { controller, healthService, database, redis, meilisearch, disk, memory };
  };

  it('live returns status ok with uptime and pid', () => {
    const { controller } = createMockServices();
    const result = controller.live();
    expect(result.status).toBe('ok');
    expect(typeof result.uptimeSec).toBe('number');
    expect(typeof result.timestamp).toBe('string');
    expect(typeof result.pid).toBe('number');
  });

  it('ready executes readiness checks for core dependencies', async () => {
    const { controller, healthService, database, redis } = createMockServices();
    await controller.ready();
    expect(healthService.check).toHaveBeenCalledOnce();
    expect(database.isHealthy).toHaveBeenCalledWith('database');
    expect(redis.isHealthy).toHaveBeenCalledWith('redis');
  });

  it('diagnostics reports full dependency pings, process stats, and workers', async () => {
    const { controller, database, redis, meilisearch } = createMockServices();
    const result = await controller.diagnostics();

    expect(result.status).toBe('healthy');
    expect(database.isHealthy).toHaveBeenCalledWith('database');
    expect(redis.isHealthy).toHaveBeenCalledWith('redis');
    expect(meilisearch.ping).toHaveBeenCalledWith('meilisearch');

    expect(result.dependencies.database.name).toBe('PostgreSQL');
    expect(result.dependencies.database.status).toBe('up');
    expect(result.dependencies.database.latencyMs).toBe(3);

    expect(result.dependencies.redis.name).toBe('Redis');
    expect(result.dependencies.redis.status).toBe('up');
    expect(result.dependencies.redis.latencyMs).toBe(2);

    expect(result.dependencies.meilisearch.name).toBe('Meilisearch');
    expect(result.dependencies.meilisearch.status).toBe('up');
    expect(result.dependencies.meilisearch.latencyMs).toBe(5);

    expect(result.process.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(result.process.memory.heapUsedMb).toBeGreaterThan(0);
    expect(Array.isArray(result.workers.queues)).toBe(true);
    expect(typeof result.workers.summary.totalWaiting).toBe('number');
  });

  it('diagnostics gracefully handles dependency failure without throwing', async () => {
    const { controller, database, meilisearch } = createMockServices();
    database.isHealthy.mockRejectedValueOnce(new Error('Connection refused'));
    meilisearch.ping.mockResolvedValueOnce({
      status: 'down',
      latencyMs: 10,
      host: 'http://localhost:7700',
      message: 'Network error',
    });

    const result = await controller.diagnostics();
    expect(result.status).toBe('degraded');
    expect(result.dependencies.database.status).toBe('down');
    expect(result.dependencies.database.error).toBe('Connection refused');
    expect(result.dependencies.meilisearch.status).toBe('down');
    expect(result.dependencies.meilisearch.error).toBe('Network error');
  });

  it('workers returns queue snapshot summaries', async () => {
    const { controller } = createMockServices();
    const result = await controller.workers();
    expect(typeof result.timestamp).toBe('string');
    expect(typeof result.summary.totalQueues).toBe('number');
    expect(Array.isArray(result.queues)).toBe(true);
  });
});
