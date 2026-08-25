import type { ReturnLineSnapshot } from '../returns.types';

/** FIFO allocate accepted inspection qty across return lines. */
export function allocateAcceptedRestoreLines(input: {
  readonly items: readonly ReturnLineSnapshot[];
  readonly quantityAccepted: number;
}): readonly {
  readonly variantId: string;
  readonly warehouseId: string;
  readonly quantity: number;
}[] {
  let remaining = input.quantityAccepted;
  const lines: { variantId: string; warehouseId: string; quantity: number }[] = [];
  for (const item of input.items) {
    if (remaining < 1) {
      break;
    }
    if (!item.warehouseId) {
      continue;
    }
    const qty = Math.min(item.quantity, remaining);
    if (qty > 0) {
      lines.push({
        variantId: item.variantId,
        warehouseId: item.warehouseId,
        quantity: qty,
      });
      remaining -= qty;
    }
  }
  return lines;
}
