import type { ConnectionOptions, QueueOptions, Telemetry, WorkerOptions } from 'bullmq';
import { BullMQOtel } from 'bullmq-otel';

let cached: BullMQOtel | undefined;

function otelEnabled(): boolean {
  const raw = process.env['OTEL_ENABLED'];
  return raw === 'true' || raw === '1';
}

/**
 * Shared BullMQ OpenTelemetry bridge (official `bullmq-otel`).
 * Returns undefined when OTEL_ENABLED is off so queues stay silent in unit tests.
 */
export function getBullmqTelemetry(): Telemetry | undefined {
  if (!otelEnabled()) {
    return undefined;
  }
  cached ??= new BullMQOtel({
    tracerName: 'octopus-bullmq',
    meterName: 'octopus-bullmq',
    enableMetrics: false,
  });
  return cached;
}

/** Queue options with optional OTel (exactOptionalPropertyTypes-safe). */
export function bullmqQueueOptions(connection: ConnectionOptions): QueueOptions {
  const telemetry = getBullmqTelemetry();
  if (telemetry) {
    return { connection, telemetry };
  }
  return { connection };
}

/** Worker options with optional OTel (exactOptionalPropertyTypes-safe). */
export function bullmqWorkerOptions(
  connection: ConnectionOptions,
  concurrency: number,
  lockDurationMs = 30_000,
): WorkerOptions {
  const telemetry = getBullmqTelemetry();
  const stalledInterval = Math.max(5_000, Math.floor(lockDurationMs / 2));
  if (telemetry) {
    return {
      connection,
      concurrency,
      lockDuration: lockDurationMs,
      stalledInterval,
      telemetry,
    };
  }
  return {
    connection,
    concurrency,
    lockDuration: lockDurationMs,
    stalledInterval,
  };
}
