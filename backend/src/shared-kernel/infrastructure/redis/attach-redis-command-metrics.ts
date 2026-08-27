import type Redis from 'ioredis';
import type { Command } from 'ioredis';
import { recordRedisCommandDuration } from '../observability/redis-metrics';

type SendCommand = (command: Command, stream?: object) => unknown;

/**
 * Times ioredis sendCommand completions into octopus.redis.command.duration.
 * Spans still come from @opentelemetry/instrumentation-ioredis when OTEL is on.
 */
export function attachRedisCommandMetrics(redis: Redis): Redis {
  const original = redis.sendCommand.bind(redis) as SendCommand;

  redis.sendCommand = ((command: Command, stream?: object) => {
    if (!command || typeof command !== 'object') {
      return original(command, stream);
    }

    const start = performance.now();
    const name = typeof command.name === 'string' ? command.name : 'unknown';
    const origResolve = command.resolve.bind(command);
    const origReject = command.reject.bind(command);

    command.resolve = ((result: unknown) => {
      recordRedisCommandDuration(name, performance.now() - start);
      return origResolve(result);
    }) as typeof command.resolve;

    command.reject = ((error: Error) => {
      recordRedisCommandDuration(name, performance.now() - start);
      return origReject(error);
    }) as typeof command.reject;

    return stream !== undefined ? original(command, stream) : original(command);
  }) as typeof redis.sendCommand;

  return redis;
}
