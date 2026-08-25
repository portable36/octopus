/** Sellable restock vs unsellable quarantine — no parallel stock system. */
export type ReturnStockDisposition = 'SELLABLE' | 'UNSELLABLE';

const SELLABLE: ReadonlySet<string> = new Set(['NEW', 'LIKE_NEW', 'USED']);

/**
 * Map inspection condition to inventory disposition.
 * Unknown/damaged/defective/unsellable never inflate sellable on-hand.
 */
export function dispositionForReturnCondition(condition: string): ReturnStockDisposition {
  return SELLABLE.has(condition) ? 'SELLABLE' : 'UNSELLABLE';
}
