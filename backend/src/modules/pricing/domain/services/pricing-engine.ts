import { CurrencyMismatchError, InvalidMoneyInputError } from '../errors/pricing.errors';
import type { Promotion } from '../aggregates/promotion.aggregate';
import type { PriceQuote, QuoteLineInput, QuoteLineResult } from '../pricing.types';

export interface PricingEngineInput {
  readonly vendorId: string;
  readonly storeId: string;
  readonly currencyCode: string;
  readonly lines: readonly QuoteLineInput[];
  readonly shippingMinor?: number;
  /** Tax rate in basis points (100 bps = 1%). Applied to (subtotal - discount). */
  readonly taxRateBps?: number;
  /** Commission rate in basis points on (subtotal - discount). */
  readonly commissionRateBps?: number;
  readonly promotion?: Promotion | null;
  readonly customerUsageCount?: number;
  readonly at?: Date;
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidMoneyInputError(`${label} must be a non-negative integer.`);
  }
}

function unitStartingPrice(line: QuoteLineInput): number {
  assertNonNegativeInteger(line.unitBasePriceMinor, 'unitBasePriceMinor');
  if (line.unitSalePriceMinor === undefined) {
    return line.unitBasePriceMinor;
  }
  assertNonNegativeInteger(line.unitSalePriceMinor, 'unitSalePriceMinor');
  return Math.min(line.unitBasePriceMinor, line.unitSalePriceMinor);
}

/**
 * Authoritative pricing engine. Browser totals are display hints only.
 * Discount allocation is proportional across eligible lines (largest remainder).
 */
export function calculatePriceQuote(input: PricingEngineInput): PriceQuote {
  const currencyCode = input.currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new InvalidMoneyInputError('Currency must be a 3-letter ISO 4217 code.');
  }
  if (input.lines.length === 0) {
    throw new InvalidMoneyInputError('Quote requires at least one line.');
  }

  const shippingMinor = input.shippingMinor ?? 0;
  const taxRateBps = input.taxRateBps ?? 0;
  const commissionRateBps = input.commissionRateBps ?? 0;
  assertNonNegativeInteger(shippingMinor, 'shippingMinor');
  assertNonNegativeInteger(taxRateBps, 'taxRateBps');
  assertNonNegativeInteger(commissionRateBps, 'commissionRateBps');
  if (taxRateBps > 100_000 || commissionRateBps > 100_000) {
    throw new InvalidMoneyInputError('Rate basis points out of range.');
  }

  const at = input.at ?? new Date();

  const lineBases = input.lines.map((line) => {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new InvalidMoneyInputError('Line quantity must be a positive integer.');
    }
    const unitSale = unitStartingPrice(line);
    const lineSubtotal = unitSale * line.quantity;
    return { line, unitSale, lineSubtotal };
  });

  const subtotalMinor = lineBases.reduce((sum, row) => sum + row.lineSubtotal, 0);

  let discountMinor = 0;
  let appliedPromotionId: string | null = null;
  let appliedCouponCode: string | null = null;
  const eligibleFlags = lineBases.map(() => false);

  if (input.promotion) {
    if (input.promotion.currencyCode !== currencyCode) {
      throw new CurrencyMismatchError();
    }
    input.promotion.assertApplicable({
      vendorId: input.vendorId,
      storeId: input.storeId,
      currencyCode,
      subtotalMinor,
      at,
      ...(input.customerUsageCount !== undefined
        ? { customerUsageCount: input.customerUsageCount }
        : {}),
    });

    let eligibleSubtotal = 0;
    for (let i = 0; i < lineBases.length; i += 1) {
      const row = lineBases[i]!;
      const eligible = input.promotion.isLineEligible(row.line);
      eligibleFlags[i] = eligible;
      if (eligible) {
        eligibleSubtotal += row.lineSubtotal;
      }
    }
    discountMinor = input.promotion.computeDiscountMinor(eligibleSubtotal);
    appliedPromotionId = input.promotion.id.value;
    appliedCouponCode = input.promotion.couponCode;
  }

  const lineDiscounts = allocateDiscount(
    lineBases.map((r) => r.lineSubtotal),
    eligibleFlags,
    discountMinor,
  );

  const lines: QuoteLineResult[] = lineBases.map((row, index) => {
    const lineDiscount = lineDiscounts[index]!;
    const lineTaxable = row.lineSubtotal - lineDiscount;
    const lineTax = Math.round((lineTaxable * taxRateBps) / 10_000);
    return {
      lineId: row.line.lineId,
      variantId: row.line.variantId,
      quantity: row.line.quantity,
      unitBasePriceMinor: row.line.unitBasePriceMinor,
      unitSalePriceMinor: row.unitSale,
      lineSubtotalMinor: row.lineSubtotal,
      lineDiscountMinor: lineDiscount,
      lineTaxableMinor: lineTaxable,
      lineTaxMinor: lineTax,
      lineTotalMinor: lineTaxable + lineTax,
    };
  });

  const taxMinor = lines.reduce((sum, line) => sum + line.lineTaxMinor, 0);
  const taxableBase = subtotalMinor - discountMinor;
  const commissionMinor = Math.round((taxableBase * commissionRateBps) / 10_000);
  const totalMinor = taxableBase + shippingMinor + taxMinor;

  return {
    currencyCode,
    vendorId: input.vendorId,
    storeId: input.storeId,
    lines,
    subtotalMinor,
    discountMinor,
    shippingMinor,
    taxMinor,
    commissionMinor,
    totalMinor,
    appliedPromotionId,
    appliedCouponCode,
    snapshot: {
      taxRateBps,
      commissionRateBps,
      evaluatedAt: at.toISOString(),
    },
  };
}

/** Largest-remainder allocation so integer discounts sum exactly. */
function allocateDiscount(
  lineSubtotals: readonly number[],
  eligible: readonly boolean[],
  discountMinor: number,
): number[] {
  const result = lineSubtotals.map(() => 0);
  if (discountMinor === 0) {
    return result;
  }
  const eligibleTotal = lineSubtotals.reduce(
    (sum, amount, i) => (eligible[i] ? sum + amount : sum),
    0,
  );
  if (eligibleTotal === 0) {
    return result;
  }

  const exact: { index: number; share: number; floor: number; frac: number }[] = [];
  let allocated = 0;
  for (let i = 0; i < lineSubtotals.length; i += 1) {
    if (!eligible[i]) {
      continue;
    }
    const share = (lineSubtotals[i]! * discountMinor) / eligibleTotal;
    const floor = Math.floor(share);
    exact.push({ index: i, share, floor, frac: share - floor });
    result[i] = floor;
    allocated += floor;
  }

  let remainder = discountMinor - allocated;
  exact.sort((a, b) => b.frac - a.frac);
  for (const row of exact) {
    if (remainder <= 0) {
      break;
    }
    result[row.index]! += 1;
    remainder -= 1;
  }
  return result;
}
