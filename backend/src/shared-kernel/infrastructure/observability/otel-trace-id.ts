import { trace } from '@opentelemetry/api';

/** Active W3C trace id, or undefined when SDK is off / no span. */
export function activeOtelTraceId(): string | undefined {
  const span = trace.getActiveSpan();
  if (!span) {
    return undefined;
  }
  const { traceId } = span.spanContext();
  if (!traceId || /^0+$/.test(traceId)) {
    return undefined;
  }
  return traceId;
}
