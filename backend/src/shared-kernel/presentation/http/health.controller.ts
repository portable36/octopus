import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from '../../infrastructure/health/database.health-indicator';
import { MeilisearchHealthIndicator } from '../../infrastructure/health/meilisearch.health-indicator';
import { RedisHealthIndicator } from '../../infrastructure/health/redis.health-indicator';
import { getQueueMetricsSnapshot } from '../../infrastructure/observability/queue-metrics';
import { Public } from './public.decorator';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly meilisearch: MeilisearchHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness probe' })
  live(): { status: string; uptimeSec: number; timestamp: string; pid: number } {
    return {
      status: 'ok',
      uptimeSec: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      pid: process.pid,
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Dependency readiness probe' })
  ready() {
    return this.health.check([
      () => this.database.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
      () =>
        this.disk.checkStorage('disk', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.95,
        }),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }

  @Get('diagnostics')
  @ApiOperation({ summary: 'Comprehensive dependency ping & production health diagnostics' })
  async diagnostics() {
    const mem = process.memoryUsage();

    let dbStatus: 'up' | 'down' = 'down';
    let dbLatencyMs = 0;
    let dbError: string | null = null;
    try {
      const res = await this.database.isHealthy('database');
      const dbInfo = res['database'] as { status?: string; latencyMs?: number } | undefined;
      dbStatus = dbInfo?.status === 'up' ? 'up' : 'down';
      dbLatencyMs = dbInfo?.latencyMs ?? 0;
    } catch (err: unknown) {
      dbError = err instanceof Error ? err.message : 'Database check failed';
    }

    let redisStatus: 'up' | 'down' = 'down';
    let redisLatencyMs = 0;
    let redisError: string | null = null;
    try {
      const res = await this.redis.isHealthy('redis');
      const redisInfo = res['redis'] as { status?: string; latencyMs?: number } | undefined;
      redisStatus = redisInfo?.status === 'up' ? 'up' : 'down';
      redisLatencyMs = redisInfo?.latencyMs ?? 0;
    } catch (err: unknown) {
      redisError = err instanceof Error ? err.message : 'Redis check failed';
    }

    const meiliResult = await this.meilisearch.ping('meilisearch');

    const queueSnapshots = await getQueueMetricsSnapshot();
    const totalWaiting = queueSnapshots.reduce((acc, q) => acc + q.waiting, 0);
    const totalActive = queueSnapshots.reduce((acc, q) => acc + q.active, 0);
    const totalFailed = queueSnapshots.reduce((acc, q) => acc + q.failed, 0);
    const totalDelayed = queueSnapshots.reduce((acc, q) => acc + q.delayed, 0);

    const isSystemHealthy =
      dbStatus === 'up' &&
      redisStatus === 'up' &&
      meiliResult.status !== 'down' &&
      totalFailed === 0;

    return {
      status: isSystemHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      process: {
        uptimeSec: Math.floor(process.uptime()),
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          heapUsedBytes: mem.heapUsed,
          heapTotalBytes: mem.heapTotal,
          rssBytes: mem.rss,
          heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
          heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
          rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        },
      },
      dependencies: {
        database: {
          name: 'PostgreSQL',
          status: dbStatus,
          latencyMs: dbLatencyMs,
          error: dbError,
        },
        redis: {
          name: 'Redis',
          status: redisStatus,
          latencyMs: redisLatencyMs,
          error: redisError,
        },
        meilisearch: {
          name: 'Meilisearch',
          status: meiliResult.status,
          latencyMs: meiliResult.latencyMs,
          host: meiliResult.host ?? null,
          error: meiliResult.message ?? null,
        },
      },
      workers: {
        summary: {
          totalQueues: queueSnapshots.length,
          totalWaiting,
          totalActive,
          totalFailed,
          totalDelayed,
        },
        queues: queueSnapshots,
      },
    };
  }

  @Get('workers')
  @ApiOperation({ summary: 'Background worker BullMQ queue metrics snapshot' })
  async workers() {
    const queueSnapshots = await getQueueMetricsSnapshot();
    const totalWaiting = queueSnapshots.reduce((acc, q) => acc + q.waiting, 0);
    const totalActive = queueSnapshots.reduce((acc, q) => acc + q.active, 0);
    const totalFailed = queueSnapshots.reduce((acc, q) => acc + q.failed, 0);
    const totalDelayed = queueSnapshots.reduce((acc, q) => acc + q.delayed, 0);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalQueues: queueSnapshots.length,
        totalWaiting,
        totalActive,
        totalFailed,
        totalDelayed,
      },
      queues: queueSnapshots,
    };
  }
}
