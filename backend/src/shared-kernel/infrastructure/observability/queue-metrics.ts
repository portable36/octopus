import { metrics } from '@opentelemetry/api';
import type { Queue } from 'bullmq';

const meter = metrics.getMeter('octopus-queue');
const queueRefs = new Map<string, Queue>();
let gaugesStarted = false;

/**
 * Registers BullMQ queues for depth/lag observable gauges (idempotent per queue name).
 * Call after Queue instances are created (e.g. outbox dispatcher onModuleInit).
 */
export function registerBullmqQueueMetrics(
  queues: ReadonlyArray<{ readonly name: string; readonly queue: Queue }>,
): void {
  for (const entry of queues) {
    queueRefs.set(entry.name, entry.queue);
  }
  ensureGauges();
}

function ensureGauges(): void {
  if (gaugesStarted) {
    return;
  }
  gaugesStarted = true;

  meter
    .createObservableGauge('octopus.queue.depth', {
      description: 'BullMQ job counts by queue and state',
      unit: '{job}',
    })
    .addCallback(async (observer) => {
      for (const [name, queue] of queueRefs) {
        try {
          const counts = await queue.getJobCounts('waiting', 'delayed', 'active', 'failed');
          observer.observe(counts.waiting ?? 0, {
            'messaging.destination.name': name,
            'octopus.queue.state': 'waiting',
          });
          observer.observe(counts.delayed ?? 0, {
            'messaging.destination.name': name,
            'octopus.queue.state': 'delayed',
          });
          observer.observe(counts.active ?? 0, {
            'messaging.destination.name': name,
            'octopus.queue.state': 'active',
          });
          observer.observe(counts.failed ?? 0, {
            'messaging.destination.name': name,
            'octopus.queue.state': 'failed',
          });
        } catch {
          // Queue may be closing during shutdown.
        }
      }
    });

  meter
    .createObservableGauge('octopus.queue.lag', {
      description: 'Age of the oldest waiting BullMQ job in milliseconds',
      unit: 'ms',
    })
    .addCallback(async (observer) => {
      for (const [name, queue] of queueRefs) {
        try {
          const jobs = await queue.getJobs(['waiting'], 0, 0, true);
          const oldest = jobs[0];
          const lagMs =
            oldest && typeof oldest.timestamp === 'number'
              ? Math.max(0, Date.now() - oldest.timestamp)
              : 0;
          observer.observe(lagMs, { 'messaging.destination.name': name });
        } catch {
          // Queue may be closing during shutdown.
        }
      }
    });
}

export interface QueueMetricsSnapshot {
  readonly name: string;
  readonly waiting: number;
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly delayed: number;
  readonly paused: boolean;
  readonly lagMs: number;
  readonly status: 'healthy' | 'degraded' | 'critical';
}

/**
 * Returns a real-time point-in-time snapshot of all registered BullMQ queues.
 */
export async function getQueueMetricsSnapshot(): Promise<QueueMetricsSnapshot[]> {
  const snapshots: QueueMetricsSnapshot[] = [];
  for (const [name, queue] of queueRefs) {
    try {
      const counts = await queue.getJobCounts(
        'waiting',
        'delayed',
        'active',
        'failed',
        'completed',
      );
      const isPaused = typeof queue.isPaused === 'function' ? await queue.isPaused() : false;
      const jobs = await queue.getJobs(['waiting'], 0, 0, true);
      const oldest = jobs[0];
      const lagMs =
        oldest && typeof oldest.timestamp === 'number'
          ? Math.max(0, Date.now() - oldest.timestamp)
          : 0;

      const failedCount = counts.failed ?? 0;
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (failedCount > 50 || lagMs > 60_000) {
        status = 'critical';
      } else if (failedCount > 0 || lagMs > 10_000) {
        status = 'degraded';
      }

      snapshots.push({
        name,
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: failedCount,
        delayed: counts.delayed ?? 0,
        paused: isPaused,
        lagMs,
        status,
      });
    } catch {
      snapshots.push({
        name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
        lagMs: 0,
        status: 'critical',
      });
    }
  }
  return snapshots;
}
