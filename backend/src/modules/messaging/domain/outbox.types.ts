export type OutboxSource = 'payment' | 'fulfillment' | 'returns';

export type OutboxRow = {
  readonly id: string;
  readonly source: OutboxSource;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly eventVersion: number;
  readonly createdAt: Date;
  readonly retryCount: number;
};

export type OutboxJobPayload = {
  readonly outboxId: string;
  readonly source: OutboxSource;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly eventVersion: number;
};

/** Stable BullMQ queue names for Phase 12. */
export const QUEUE_NAMES = {
  domainEvents: 'octopus.domain-events',
  email: 'octopus.email',
  notification: 'octopus.notification',
  searchIndexing: 'octopus.search-indexing',
  payment: 'octopus.payment',
  webhooks: 'octopus.webhooks',
  payout: 'octopus.payout',
  analytics: 'octopus.analytics',
  deadLetter: 'octopus.dead-letter',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export function routeQueueForEvent(eventType: string): QueueName {
  if (
    eventType.startsWith('Cod') ||
    eventType.includes('Payment') ||
    eventType.includes('Refund')
  ) {
    return QUEUE_NAMES.payment;
  }
  if (
    eventType.startsWith('Return') ||
    eventType.includes('Shipment') ||
    eventType.includes('Courier')
  ) {
    return QUEUE_NAMES.domainEvents;
  }
  return QUEUE_NAMES.domainEvents;
}
