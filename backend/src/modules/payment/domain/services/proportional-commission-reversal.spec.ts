import { describe, expect, it } from 'vitest';
import { proportionalCommissionReversal } from './proportional-commission-reversal';

describe('proportionalCommissionReversal', () => {
  it('scales commission by refund / order total', () => {
    expect(
      proportionalCommissionReversal({
        commissionMinor: 100,
        refundAmountMinor: 500,
        orderTotalMinor: 1000,
      }),
    ).toBe(50);
  });

  it('floors fractional paisa and returns 0 when missing inputs', () => {
    expect(
      proportionalCommissionReversal({
        commissionMinor: 100,
        refundAmountMinor: 1,
        orderTotalMinor: 300,
      }),
    ).toBe(0);
    expect(
      proportionalCommissionReversal({
        commissionMinor: 0,
        refundAmountMinor: 500,
        orderTotalMinor: 1000,
      }),
    ).toBe(0);
  });
});
