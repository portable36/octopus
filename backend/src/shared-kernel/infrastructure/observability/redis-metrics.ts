import { metrics, ValueType } from '@opentelemetry/api';

const meter = metrics.getMeter('octopus-redis');

type DurationHistogram = ReturnType<typeof meter.createHistogram>;

let durationHistogram: DurationHistogram | undefined;

function duration(): DurationHistogram {
  if (!durationHistogram) {
    durationHistogram = meter.createHistogram('octopus.redis.command.duration', {
      description: 'Redis command duration in milliseconds',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    });
  }
  return durationHistogram;
}

/** Records Redis command latency (noop when OTel metrics SDK is off). */
export function recordRedisCommandDuration(command: string, durationMs: number): void {
  const name = command.trim().toUpperCase() || 'UNKNOWN';
  duration().record(durationMs, { 'db.operation.name': name });
}
