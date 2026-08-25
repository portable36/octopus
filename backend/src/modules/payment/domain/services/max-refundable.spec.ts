import { describe, expect, it } from 'vitest';
import { computeMaxRefundable } from './max-refundable';

describe('computeMaxRefundable', () => {
  it('returns full capture when nothing refunded', () => {
    expect(computeMaxRefundable({ capturedAmountMinor: 1500, refundedOrPendingMinor: 0 })).toBe(
      1500,
    );
  });

  it('supports partial refunds', () => {
    expect(computeMaxRefundable({ capturedAmountMinor: 1500, refundedOrPendingMinor: 400 })).toBe(
      1100,
    );
  });

  it('never goes negative when over-allocated', () => {
    expect(computeMaxRefundable({ capturedAmountMinor: 1000, refundedOrPendingMinor: 1000 })).toBe(
      0,
    );
    expect(computeMaxRefundable({ capturedAmountMinor: 1000, refundedOrPendingMinor: 1200 })).toBe(
      0,
    );
  });
});
