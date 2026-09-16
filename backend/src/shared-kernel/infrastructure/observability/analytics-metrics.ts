import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('octopus-business');

type Counter = ReturnType<typeof meter.createCounter>;

let analyticsEventCounter: Counter | undefined;

function analyticsEvents(): Counter {
  if (!analyticsEventCounter) {
    analyticsEventCounter = meter.createCounter('octopus.analytics.events', {
      description: 'First-party analytics events processed from octopus.analytics',
    });
  }
  return analyticsEventCounter;
}

/** Record a funnel/analytics event name (low-cardinality labels only). */
export function recordAnalyticsEvent(eventName: string): void {
  const name = eventName.trim() || 'unknown';
  analyticsEvents().add(1, { 'octopus.analytics.event': name.slice(0, 64) });
}
