import { Inject, Injectable } from '@nestjs/common';
import {
  PRICING_PORT,
  type CreateRecoveryPromotionInput,
  type PricingPort,
  type PricingQuoteRequest,
  type PricingQuoteResult,
  type RecordPromotionUsageInput,
} from '../../../../shared-kernel/application/ports/pricing.port';
import { Promotion } from '../../domain/aggregates/promotion.aggregate';
import {
  PROMOTION_REPOSITORY,
  type PromotionRepository,
} from '../../application/ports/promotion-repository.interface';
import { PricingQuoteHandler } from '../../application/commands/pricing.handlers';

@Injectable()
export class PricingPortAdapter implements PricingPort {
  constructor(
    @Inject(PricingQuoteHandler) private readonly quotes: PricingQuoteHandler,
    @Inject(PROMOTION_REPOSITORY) private readonly promotions: PromotionRepository,
  ) {}

  public async quote(input: PricingQuoteRequest): Promise<PricingQuoteResult> {
    return this.quotes.quote(input);
  }

  public async recordUsage(input: RecordPromotionUsageInput): Promise<void> {
    await this.quotes.recordUsage(input);
  }

  public async createRecoveryPromotion(input: CreateRecoveryPromotionInput): Promise<void> {
    const promotion = Promotion.create({
      vendorId: input.vendorId,
      storeId: input.storeId,
      name: input.name,
      couponCode: input.couponCode,
      discountType: 'PERCENTAGE',
      discountValue: input.discountPercent,
      currencyCode: input.currencyCode,
      scope: 'STORE',
      usageLimit: 1,
      perCustomerLimit: 1,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    });
    promotion.activate();
    await this.promotions.save(promotion);
  }
}

export { PRICING_PORT };
