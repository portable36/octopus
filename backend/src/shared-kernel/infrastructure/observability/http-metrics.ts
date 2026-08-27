import { metrics, ValueType } from '@opentelemetry/api';

const meter = metrics.getMeter('octopus-http');

type DurationHistogram = ReturnType<typeof meter.createHistogram>;
type RequestCounter = ReturnType<typeof meter.createCounter>;

let durationHistogram: DurationHistogram | undefined;
let requestCounter: RequestCounter | undefined;

function instruments(): {
  duration: DurationHistogram;
  requests: RequestCounter;
} {
  if (!durationHistogram || !requestCounter) {
    durationHistogram = meter.createHistogram('octopus.http.server.duration', {
      description: 'HTTP request duration in milliseconds',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    });
    requestCounter = meter.createCounter('octopus.http.server.requests', {
      description: 'HTTP request count by method, route, and status class',
    });
  }
  return { duration: durationHistogram, requests: requestCounter };
}

export type HttpServerRequestMetric = {
  readonly method: string;
  readonly route: string;
  readonly statusCode: number;
  readonly durationMs: number;
};

/** Records request latency + count (noop instruments when OTel metrics SDK is off). */
export function recordHttpServerRequest(input: HttpServerRequestMetric): void {
  const statusClass = `${Math.floor(input.statusCode / 100)}xx`;
  const attributes = {
    'http.method': input.method,
    'http.route': input.route,
    'http.status_class': statusClass,
  };
  const { duration, requests } = instruments();
  duration.record(input.durationMs, attributes);
  requests.add(1, attributes);
}
