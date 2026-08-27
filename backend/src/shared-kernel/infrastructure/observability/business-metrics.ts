import { metrics, ValueType } from '@opentelemetry/api';

const meter = metrics.getMeter('octopus-business');

type Counter = ReturnType<typeof meter.createCounter>;
type Histogram = ReturnType<typeof meter.createHistogram>;

let checkoutCounter: Counter | undefined;
let paymentFailureCounter: Counter | undefined;
let inventoryConflictCounter: Counter | undefined;
let payoutFailureCounter: Counter | undefined;
let searchIndexingLag: Histogram | undefined;

function checkout(): Counter {
  if (!checkoutCounter) {
    checkoutCounter = meter.createCounter('octopus.checkout.outcomes', {
      description: 'Checkout submit outcomes',
    });
  }
  return checkoutCounter;
}

function paymentFailures(): Counter {
  if (!paymentFailureCounter) {
    paymentFailureCounter = meter.createCounter('octopus.payment.failures', {
      description: 'Payment/refund failures by kind',
    });
  }
  return paymentFailureCounter;
}

function inventoryConflicts(): Counter {
  if (!inventoryConflictCounter) {
    inventoryConflictCounter = meter.createCounter('octopus.inventory.conflicts', {
      description: 'Inventory reservation conflicts (e.g. insufficient stock)',
    });
  }
  return inventoryConflictCounter;
}

function payoutFailures(): Counter {
  if (!payoutFailureCounter) {
    payoutFailureCounter = meter.createCounter('octopus.payout.failures', {
      description: 'Payout disbursement failures',
    });
  }
  return payoutFailureCounter;
}

function searchLag(): Histogram {
  if (!searchIndexingLag) {
    searchIndexingLag = meter.createHistogram('octopus.search.indexing.lag', {
      description: 'Delay from BullMQ enqueue to search index job completion',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    });
  }
  return searchIndexingLag;
}

export function recordCheckoutOutcome(outcome: 'success' | 'failure'): void {
  checkout().add(1, { 'octopus.checkout.outcome': outcome });
}

export function recordPaymentFailure(kind: string): void {
  paymentFailures().add(1, { 'octopus.payment.failure_kind': kind });
}

export function recordInventoryConflict(kind: string): void {
  inventoryConflicts().add(1, { 'octopus.inventory.conflict_kind': kind });
}

export function recordPayoutFailure(): void {
  payoutFailures().add(1);
}

export function recordSearchIndexingLag(lagMs: number): void {
  searchLag().record(Math.max(0, lagMs));
}
