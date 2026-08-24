import { Inject, Injectable } from '@nestjs/common';
import {
  PRICING_PORT,
  type PricingPort,
  type PricingQuoteRequest,
  type PricingQuoteResult,
  type RecordPromotionUsageInput,
} from '../../../../shared-kernel/application/ports/pricing.port';
import { PricingQuoteHandler } from '../../application/commands/pricing.handlers';

@Injectable()
export class PricingPortAdapter implements PricingPort {
  constructor(@Inject(PricingQuoteHandler) private readonly quotes: PricingQuoteHandler) {}

  public async quote(input: PricingQuoteRequest): Promise<PricingQuoteResult> {
    return this.quotes.quote(input);
  }

  public async recordUsage(input: RecordPromotionUsageInput): Promise<void> {
    await this.quotes.recordUsage(input);
  }
}

export { PRICING_PORT };
