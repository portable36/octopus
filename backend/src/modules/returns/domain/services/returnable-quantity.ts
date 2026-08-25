import type { ReturnStatus } from '../returns.types';
import { RETURN_QTY_RELEASE_STATUSES } from '../returns.types';

export type ReturnableLineInput = {
  readonly orderItemId: string;
  readonly fulfilledQuantity: number;
};

export type ExistingReturnLine = {
  readonly orderItemId: string;
  readonly quantity: number;
  readonly status: ReturnStatus;
};

/**
 * returnable = fulfilled − qty on returns that still consume the allowance.
 */
export function computeReturnableQuantity(
  line: ReturnableLineInput,
  existing: readonly ExistingReturnLine[],
): number {
  const reserved = existing
    .filter(
      (row) =>
        row.orderItemId === line.orderItemId && !RETURN_QTY_RELEASE_STATUSES.includes(row.status),
    )
    .reduce((sum, row) => sum + row.quantity, 0);
  return Math.max(0, line.fulfilledQuantity - reserved);
}

export function assertReturnable(
  line: ReturnableLineInput,
  requested: number,
  existing: readonly ExistingReturnLine[],
): void {
  if (!Number.isInteger(requested) || requested < 1) {
    throw new Error('Return quantity must be a positive integer.');
  }
  const returnable = computeReturnableQuantity(line, existing);
  if (requested > returnable) {
    throw new Error(
      `Requested ${requested} exceeds returnable ${returnable} for line ${line.orderItemId}.`,
    );
  }
}
