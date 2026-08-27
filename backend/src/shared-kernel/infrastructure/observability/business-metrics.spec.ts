import { describe, expect, it } from 'vitest';
import {
  recordCheckoutOutcome,
  recordInventoryConflict,
  recordPaymentFailure,
  recordPayoutFailure,
  recordSearchIndexingLag,
} from './business-metrics';

describe('business metrics', () => {
  it('does not throw when MeterProvider is the global noop', () => {
    expect(() => recordCheckoutOutcome('success')).not.toThrow();
    expect(() => recordCheckoutOutcome('failure')).not.toThrow();
    expect(() => recordPaymentFailure('refund_provider')).not.toThrow();
    expect(() => recordInventoryConflict('insufficient_stock')).not.toThrow();
    expect(() => recordPayoutFailure()).not.toThrow();
    expect(() => recordSearchIndexingLag(42)).not.toThrow();
  });
});
