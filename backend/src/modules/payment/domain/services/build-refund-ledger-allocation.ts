import type { LedgerRefundAllocation } from '../../../../shared-kernel/application/ports/ledger.port';
import { proportionalCommissionReversal } from './proportional-commission-reversal';

/** Build the allocation payload embedded in RefundCompleted outbox events. */
export function buildRefundLedgerAllocation(input: {
  readonly refundId: string;
  readonly paymentIntentId: string;
  readonly orderId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly returnId: string | null;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly method: string;
  /** Order snapshot commission (never reprice). */
  readonly orderCommissionMinor?: number | null;
  /** Order snapshot total for proportional clawback denominator. */
  readonly orderTotalMinor?: number | null;
}): LedgerRefundAllocation {
  const reversal = proportionalCommissionReversal({
    commissionMinor: input.orderCommissionMinor ?? 0,
    refundAmountMinor: input.amountMinor,
    orderTotalMinor: input.orderTotalMinor ?? 0,
  });
  return {
    entryType: 'REFUND',
    refundId: input.refundId,
    paymentIntentId: input.paymentIntentId,
    orderId: input.orderId,
    vendorId: input.vendorId,
    storeId: input.storeId,
    returnId: input.returnId,
    amountMinor: input.amountMinor,
    currencyCode: input.currencyCode,
    method: input.method,
    referenceType: 'REFUND',
    referenceId: input.refundId,
    idempotencyKey: `ledger:refund:${input.refundId}`,
    commissionReversalMinor: reversal > 0 ? reversal : null,
  };
}
