export type OutboxSource =
  | 'payment'
  | 'fulfillment'
  | 'returns'
  | 'payout'
  | 'catalog'
  | 'inventory'
  | 'notification'
  | 'order';

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

/** Stable BullMQ queue names for Phase 12+. */
export const QUEUE_NAMES = {
  domainEvents: 'octopus.domain-events',
  email: 'octopus.email',
  notification: 'octopus.notification',
  searchIndexing: 'octopus.search-indexing',
  payment: 'octopus.payment',
  webhooks: 'octopus.webhooks',
  payout: 'octopus.payout',
  analytics: 'octopus.analytics',
  marketing: 'octopus.marketing',
  deadLetter: 'octopus.dead-letter',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export function routeQueueForEvent(eventType: string): QueueName {
  if (eventType === 'OrderPaid' || eventType === 'OrderCreated') {
    return QUEUE_NAMES.marketing;
  }
  if (
    eventType.startsWith('Cod') ||
    eventType.includes('Payment') ||
    eventType.includes('Refund')
  ) {
    return QUEUE_NAMES.payment;
  }
  if (
    eventType.startsWith('Vendor') ||
    eventType.startsWith('Payout') ||
    eventType.startsWith('Ledger') ||
    eventType.includes('Commission')
  ) {
    return QUEUE_NAMES.payout;
  }
  if (eventType.startsWith('Notification')) {
    return QUEUE_NAMES.notification;
  }
  if (
    eventType.startsWith('StoreOffer') ||
    eventType.startsWith('Product') ||
    eventType.startsWith('Inventory') ||
    eventType.startsWith('SearchReindex')
  ) {
    return QUEUE_NAMES.searchIndexing;
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
