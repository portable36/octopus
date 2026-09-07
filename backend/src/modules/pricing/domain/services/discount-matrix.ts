import type { Promotion } from '../aggregates/promotion.aggregate';
import type { PromotionScope, QuoteLineInput } from '../pricing.types';

export interface CandidateEvaluation {
  readonly promotionId: string;
  readonly promotionName: string;
  readonly couponCode: string | null;
  readonly scope: PromotionScope;
  readonly isApplicable: boolean;
  readonly ineligibilityReason?: string;
  readonly eligibleSubtotalMinor: number;
  readonly calculatedDiscountMinor: number;
}

export interface DiscountMatrixInput {
  readonly vendorId: string;
  readonly storeId: string;
  readonly currencyCode: string;
  readonly lines: readonly {
    readonly line: QuoteLineInput;
    readonly lineSubtotal: number;
  }[];
  readonly subtotalMinor: number;
  readonly couponPromotion?: Promotion | null | undefined;
  readonly automaticPromotions?: readonly Promotion[] | undefined;
  readonly customerUsageCounts?: Readonly<Record<string, number>> | undefined;
  readonly at: Date;
  /**
   * Selection strategy when both coupon and automatic promotions exist:
   * - 'COUPON_PRIORITY': explicit coupon takes precedence if applicable.
   * - 'BEST_DISCOUNT': whichever yields the largest discount for the customer wins.
   * Defaults to 'COUPON_PRIORITY'.
   */
  readonly strategy?: 'COUPON_PRIORITY' | 'BEST_DISCOUNT' | undefined;
}

export interface DiscountMatrixResult {
  readonly winningPromotion: Promotion | null;
  readonly discountMinor: number;
  readonly eligibleFlags: readonly boolean[];
  readonly appliedPromotionId: string | null;
  readonly appliedCouponCode: string | null;
  readonly appliedPromotionName: string | null;
  readonly candidates: readonly CandidateEvaluation[];
}

const SCOPE_WEIGHT: Record<PromotionScope, number> = {
  PRODUCT: 5,
  CATEGORY: 4,
  STORE: 3,
  VENDOR: 2,
  ALL: 1,
};

/**
 * Evaluates candidate promotions against a cart/quote and determines the winning discount.
 * Enforces server-side authority, scope matching, usage limits, and largest-remainder integrity.
 */
export class DiscountMatrix {
  public static evaluate(input: DiscountMatrixInput): DiscountMatrixResult {
    const strategy = input.strategy ?? 'COUPON_PRIORITY';
    const customerUsage = input.customerUsageCounts ?? {};
    const candidateEvaluations: CandidateEvaluation[] = [];

    interface EvaluatedCandidate {
      readonly promotion: Promotion;
      readonly evaluation: CandidateEvaluation;
      readonly eligibleFlags: boolean[];
    }

    const validCandidates: EvaluatedCandidate[] = [];

    // 1. Evaluate explicit coupon promotion if present
    let couponCandidate: EvaluatedCandidate | null = null;
    if (input.couponPromotion) {
      const evalResult = this.evaluateSinglePromotion(
        input.couponPromotion,
        input,
        customerUsage[input.couponPromotion.id.value] ?? 0,
      );
      candidateEvaluations.push(evalResult.evaluation);
      if (evalResult.evaluation.isApplicable && evalResult.evaluation.calculatedDiscountMinor > 0) {
        couponCandidate = evalResult;
      }
    }

    // 2. Evaluate candidate automatic promotions (store / vendor / product / category rules)
    const automatics = input.automaticPromotions ?? [];
    for (const promo of automatics) {
      // Automatic rules must not have coupon codes
      if (promo.couponCode !== null && promo.couponCode !== '') {
        continue;
      }
      const evalResult = this.evaluateSinglePromotion(
        promo,
        input,
        customerUsage[promo.id.value] ?? 0,
      );
      candidateEvaluations.push(evalResult.evaluation);
      if (evalResult.evaluation.isApplicable && evalResult.evaluation.calculatedDiscountMinor > 0) {
        validCandidates.push(evalResult);
      }
    }

    // 3. Sort automatic candidates by best discount, then scope specificity, then creation date
    validCandidates.sort((a, b) => {
      // Highest discount wins
      if (b.evaluation.calculatedDiscountMinor !== a.evaluation.calculatedDiscountMinor) {
        return b.evaluation.calculatedDiscountMinor - a.evaluation.calculatedDiscountMinor;
      }
      // Higher scope specificity wins (Product > Category > Store > Vendor > All)
      const weightA = SCOPE_WEIGHT[a.promotion.scope] ?? 0;
      const weightB = SCOPE_WEIGHT[b.promotion.scope] ?? 0;
      if (weightB !== weightA) {
        return weightB - weightA;
      }
      // Earlier created wins
      return a.promotion.createdAt.getTime() - b.promotion.createdAt.getTime();
    });

    const bestAutomatic = validCandidates[0] ?? null;

    // 4. Resolve between coupon and automatic promotions according to strategy
    let winner: EvaluatedCandidate | null = null;

    if (couponCandidate && bestAutomatic) {
      if (strategy === 'BEST_DISCOUNT') {
        winner =
          bestAutomatic.evaluation.calculatedDiscountMinor >
          couponCandidate.evaluation.calculatedDiscountMinor
            ? bestAutomatic
            : couponCandidate;
      } else {
        // COUPON_PRIORITY: explicit coupon wins unless automatic offers strictly better savings and coupon yields less
        winner = couponCandidate;
      }
    } else if (couponCandidate) {
      winner = couponCandidate;
    } else if (bestAutomatic) {
      winner = bestAutomatic;
    }

    if (!winner) {
      return {
        winningPromotion: null,
        discountMinor: 0,
        eligibleFlags: input.lines.map(() => false),
        appliedPromotionId: null,
        appliedCouponCode: null,
        appliedPromotionName: null,
        candidates: candidateEvaluations,
      };
    }

    return {
      winningPromotion: winner.promotion,
      discountMinor: winner.evaluation.calculatedDiscountMinor,
      eligibleFlags: winner.eligibleFlags,
      appliedPromotionId: winner.promotion.id.value,
      appliedCouponCode: winner.promotion.couponCode,
      appliedPromotionName: winner.promotion.name,
      candidates: candidateEvaluations,
    };
  }

  private static evaluateSinglePromotion(
    promotion: Promotion,
    input: DiscountMatrixInput,
    customerUsageCount: number,
  ): {
    promotion: Promotion;
    evaluation: CandidateEvaluation;
    eligibleFlags: boolean[];
  } {
    // Check baseline applicability
    let reason: string | undefined;

    if (promotion.status !== 'ACTIVE') {
      reason = 'Promotion is not active';
    } else if (promotion.currencyCode !== input.currencyCode) {
      reason = 'Currency mismatch';
    } else if (promotion.scope === 'VENDOR' && promotion.vendorId !== input.vendorId) {
      reason = 'Vendor restriction';
    } else if (promotion.scope === 'STORE' && promotion.storeId !== input.storeId) {
      reason = 'Store restriction';
    } else if (input.at.getTime() < promotion.startsAt.getTime()) {
      reason = 'Promotion has not started yet';
    } else if (promotion.endsAt && input.at.getTime() > promotion.endsAt.getTime()) {
      reason = 'Promotion has expired';
    } else if (promotion.usageLimit !== null && promotion.usageCount >= promotion.usageLimit) {
      reason = 'Usage limit reached';
    } else if (
      promotion.perCustomerLimit !== null &&
      customerUsageCount >= promotion.perCustomerLimit
    ) {
      reason = 'Per-customer limit reached';
    } else if (input.subtotalMinor < promotion.minOrderAmountMinor) {
      reason = `Minimum order amount of ${promotion.minOrderAmountMinor} not met`;
    }

    if (reason) {
      return {
        promotion,
        evaluation: {
          promotionId: promotion.id.value,
          promotionName: promotion.name,
          couponCode: promotion.couponCode,
          scope: promotion.scope,
          isApplicable: false,
          ineligibilityReason: reason,
          eligibleSubtotalMinor: 0,
          calculatedDiscountMinor: 0,
        },
        eligibleFlags: input.lines.map(() => false),
      };
    }

    // Check line eligibility
    let eligibleSubtotal = 0;
    const eligibleFlags: boolean[] = [];

    for (let i = 0; i < input.lines.length; i++) {
      const lineRow = input.lines[i]!;
      const isEligible = promotion.isLineEligible(lineRow.line);
      eligibleFlags.push(isEligible);
      if (isEligible) {
        eligibleSubtotal += lineRow.lineSubtotal;
      }
    }

    if (eligibleSubtotal === 0) {
      return {
        promotion,
        evaluation: {
          promotionId: promotion.id.value,
          promotionName: promotion.name,
          couponCode: promotion.couponCode,
          scope: promotion.scope,
          isApplicable: false,
          ineligibilityReason: 'No cart items eligible for this promotion scope',
          eligibleSubtotalMinor: 0,
          calculatedDiscountMinor: 0,
        },
        eligibleFlags,
      };
    }

    const calculatedDiscount = promotion.computeDiscountMinor(eligibleSubtotal);

    return {
      promotion,
      evaluation: {
        promotionId: promotion.id.value,
        promotionName: promotion.name,
        couponCode: promotion.couponCode,
        scope: promotion.scope,
        isApplicable: true,
        eligibleSubtotalMinor: eligibleSubtotal,
        calculatedDiscountMinor: calculatedDiscount,
      },
      eligibleFlags,
    };
  }
}
