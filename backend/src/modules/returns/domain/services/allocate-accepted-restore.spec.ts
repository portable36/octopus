import { describe, expect, it } from 'vitest';
import type { ReturnLineSnapshot } from '../returns.types';
import { allocateAcceptedRestoreLines } from './allocate-accepted-restore';

const line = (
  partial: Partial<ReturnLineSnapshot> &
    Pick<ReturnLineSnapshot, 'orderItemId' | 'variantId' | 'warehouseId' | 'quantity'>,
): ReturnLineSnapshot => ({
  productId: 'p',
  sku: 's',
  productName: 'n',
  unitPriceMinor: 1,
  lineDiscountMinor: 0,
  lineTaxMinor: 0,
  lineTotalMinor: 1,
  reasonCode: 'DAMAGED',
  condition: 'UNKNOWN',
  ...partial,
});

describe('allocateAcceptedRestoreLines', () => {
  it('allocates FIFO across lines', () => {
    const lines = allocateAcceptedRestoreLines({
      quantityAccepted: 3,
      items: [
        line({ orderItemId: 'a', variantId: 'v1', warehouseId: 'w1', quantity: 2 }),
        line({ orderItemId: 'b', variantId: 'v2', warehouseId: 'w2', quantity: 5 }),
      ],
    });
    expect(lines).toEqual([
      { variantId: 'v1', warehouseId: 'w1', quantity: 2 },
      { variantId: 'v2', warehouseId: 'w2', quantity: 1 },
    ]);
  });

  it('skips lines without warehouse', () => {
    expect(
      allocateAcceptedRestoreLines({
        quantityAccepted: 2,
        items: [line({ orderItemId: 'a', variantId: 'v1', warehouseId: '', quantity: 2 })],
      }),
    ).toEqual([]);
  });
});
