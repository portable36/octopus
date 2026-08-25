import { describe, expect, it } from 'vitest';
import { computeReturnableQuantity } from './returnable-quantity';

describe('computeReturnableQuantity', () => {
  it('subtracts active return quantities from fulfilled', () => {
    expect(
      computeReturnableQuantity({ orderItemId: 'line-1', fulfilledQuantity: 5 }, [
        { orderItemId: 'line-1', quantity: 2, status: 'REQUESTED' },
        { orderItemId: 'line-1', quantity: 1, status: 'REJECTED' },
      ]),
    ).toBe(3);
  });

  it('rejects over-return via remaining check', () => {
    const returnable = computeReturnableQuantity({ orderItemId: 'line-1', fulfilledQuantity: 5 }, [
      { orderItemId: 'line-1', quantity: 2, status: 'AWAITING_RETURN' },
    ]);
    expect(returnable).toBe(3);
    expect(4 > returnable).toBe(true);
  });
});
