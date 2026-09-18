import { describe, expect, it } from 'vitest';
import {
  evaluateOpsAlerts,
  OPS_ALERT_LATENCY_WARN_MS,
  type OpsAlertsDiagnosticsInput,
} from './ops-alerts';
import type { QueueMetricsSnapshot } from './queue-metrics';

function baseInput(overrides: Partial<OpsAlertsDiagnosticsInput> = {}): OpsAlertsDiagnosticsInput {
  return {
    dependencies: {
      database: { status: 'up', latencyMs: 5 },
      redis: { status: 'up', latencyMs: 3 },
      meilisearch: { status: 'up', latencyMs: 8 },
    },
    process: {
      memory: { heapUsedBytes: 50_000_000, heapTotalBytes: 100_000_000 },
    },
    workers: {
      summary: { totalFailed: 0 },
      queues: [],
    },
    ...overrides,
  };
}

function queue(partial: Partial<QueueMetricsSnapshot> & { name: string }): QueueMetricsSnapshot {
  return {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: false,
    lagMs: 0,
    status: 'healthy',
    ...partial,
  };
}

describe('evaluateOpsAlerts', () => {
  it('returns ok with empty fired list when everything is healthy', () => {
    const result = evaluateOpsAlerts(baseInput());
    expect(result.status).toBe('ok');
    expect(result.fired).toEqual([]);
    expect(result.rules.length).toBeGreaterThan(0);
  });

  it('fires critical when Postgres is down', () => {
    const result = evaluateOpsAlerts(
      baseInput({
        dependencies: {
          database: { status: 'down', latencyMs: 0 },
          redis: { status: 'up', latencyMs: 3 },
          meilisearch: { status: 'up', latencyMs: 8 },
        },
      }),
    );
    expect(result.status).toBe('critical');
    expect(result.fired.some((a) => a.id === 'dependency.database.down')).toBe(true);
  });

  it('fires warning for high dependency latency', () => {
    const result = evaluateOpsAlerts(
      baseInput({
        dependencies: {
          database: { status: 'up', latencyMs: OPS_ALERT_LATENCY_WARN_MS + 1 },
          redis: { status: 'up', latencyMs: 3 },
          meilisearch: { status: 'up', latencyMs: 8 },
        },
      }),
    );
    expect(result.status).toBe('warning');
    expect(result.fired.some((a) => a.id === 'dependency.database.latency_high')).toBe(true);
  });

  it('fires queue lag and failed-job alerts from worker snapshots', () => {
    const result = evaluateOpsAlerts(
      baseInput({
        workers: {
          summary: { totalFailed: 3 },
          queues: [
            queue({
              name: 'octopus.email',
              failed: 3,
              lagMs: 15_000,
              status: 'degraded',
            }),
          ],
        },
      }),
    );
    expect(result.status).toBe('warning');
    expect(result.fired.some((a) => a.id === 'queue.failed_jobs')).toBe(true);
    expect(result.fired.some((a) => a.id === 'queue.octopus.email.lag_high')).toBe(true);
  });

  it('escalates failed jobs to critical when a queue is critical', () => {
    const result = evaluateOpsAlerts(
      baseInput({
        workers: {
          summary: { totalFailed: 60 },
          queues: [
            queue({
              name: 'octopus.dead-letter',
              failed: 60,
              lagMs: 70_000,
              status: 'critical',
            }),
          ],
        },
      }),
    );
    expect(result.status).toBe('critical');
    expect(result.fired.find((a) => a.id === 'queue.failed_jobs')?.severity).toBe('critical');
  });
});
