import { Inject, Injectable } from '@nestjs/common';
import type { PriceQuote } from '../../domain/pricing.types';
import { Promotion } from '../../domain/aggregates/promotion.aggregate';
import { CouponNotFoundError } from '../../domain/errors/pricing.errors';
import { calculatePriceQuote } from '../../domain/services/pricing-engine';
import { PromotionNotFoundError } from '../errors/pricing.errors';
import {
  PROMOTION_REPOSITORY,
  type PromotionRepository,
} from '../ports/promotion-repository.interface';
import { PricingAuthorizationService } from '../services/pricing-authorization.service';

@Injectable()
export class PromotionCommandHandler {
  constructor(
    @Inject(PROMOTION_REPOSITORY) private readonly promotions: PromotionRepository,
    @Inject(PricingAuthorizationService) private readonly authz: PricingAuthorizationService,
  ) {}

  public async create(input: {
    readonly storeId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly name: string;
    readonly couponCode?: string | null;
    readonly discountType: 'PERCENTAGE' | 'FIXED';
    readonly discountValue: number;
    readonly currencyCode: string;
    readonly minOrderAmountMinor?: number;
    readonly scope: 'ALL' | 'PRODUCT' | 'CATEGORY' | 'VENDOR' | 'STORE';
    readonly scopeIds?: readonly string[];
    readonly usageLimit?: number | null;
    readonly perCustomerLimit?: number | null;
    readonly startsAt: Date;
    readonly endsAt?: Date | null;
    readonly activate?: boolean;
  }): Promise<Promotion> {
    const store = await this.authz.requireMutator(
      input.storeId,
      input.actorUserId,
      input.actorRoles,
    );
    const promotion = Promotion.create({
      vendorId: store.vendorId,
      storeId: store.storeId,
      name: input.name,
      discountType: input.discountType,
      discountValue: input.discountValue,
      currencyCode: input.currencyCode,
      scope: input.scope,
      startsAt: input.startsAt,
      ...(input.couponCode !== undefined ? { couponCode: input.couponCode } : {}),
      ...(input.minOrderAmountMinor !== undefined
        ? { minOrderAmountMinor: input.minOrderAmountMinor }
        : {}),
      ...(input.scopeIds !== undefined ? { scopeIds: input.scopeIds } : {}),
      ...(input.usageLimit !== undefined ? { usageLimit: input.usageLimit } : {}),
      ...(input.perCustomerLimit !== undefined ? { perCustomerLimit: input.perCustomerLimit } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
    });
    if (input.activate) {
      promotion.activate();
    }
    await this.promotions.save(promotion);
    return promotion;
  }

  public async activate(input: {
    readonly storeId: string;
    readonly promotionId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Promotion> {
    await this.authz.requireMutator(input.storeId, input.actorUserId, input.actorRoles);
    const promotion = await this.requirePromotionForStore(input.promotionId, input.storeId);
    promotion.activate();
    await this.promotions.save(promotion);
    return promotion;
  }

  public async disable(input: {
    readonly storeId: string;
    readonly promotionId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Promotion> {
    await this.authz.requireMutator(input.storeId, input.actorUserId, input.actorRoles);
    const promotion = await this.requirePromotionForStore(input.promotionId, input.storeId);
    promotion.disable();
    await this.promotions.save(promotion);
    return promotion;
  }

  public async list(input: {
    readonly storeId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Promotion[]> {
    await this.authz.requireReader(input.storeId, input.actorUserId, input.actorRoles);
    return this.promotions.listByStore(input.storeId);
  }

  private async requirePromotionForStore(promotionId: string, storeId: string): Promise<Promotion> {
    const promotion = await this.promotions.findById(promotionId);
    if (!promotion || promotion.storeId !== storeId) {
      throw new PromotionNotFoundError();
    }
    return promotion;
  }
}

@Injectable()
export class PricingQuoteHandler {
  constructor(@Inject(PROMOTION_REPOSITORY) private readonly promotions: PromotionRepository) {}

  public async quote(input: {
    readonly vendorId: string;
    readonly storeId: string;
    readonly currencyCode: string;
    readonly lines: Parameters<typeof calculatePriceQuote>[0]['lines'];
    readonly shippingMinor?: number;
    readonly taxRateBps?: number;
    readonly commissionRateBps?: number;
    readonly couponCode?: string;
    readonly customerId?: string;
    readonly at?: Date;
  }): Promise<PriceQuote> {
    let promotion: Promotion | null = null;
    let customerUsageCount: number | undefined;

    if (input.couponCode && input.couponCode.trim() !== '') {
      promotion = await this.promotions.findByCouponCode(
        input.vendorId,
        input.couponCode.trim().toUpperCase(),
      );
      if (!promotion || promotion.status !== 'ACTIVE') {
        throw new CouponNotFoundError();
      }
      if (input.customerId) {
        customerUsageCount = await this.promotions.countCustomerUsage(
          promotion.id.value,
          input.customerId,
        );
      }
    }

    return calculatePriceQuote({
      vendorId: input.vendorId,
      storeId: input.storeId,
      currencyCode: input.currencyCode,
      lines: input.lines,
      promotion,
      ...(input.shippingMinor !== undefined ? { shippingMinor: input.shippingMinor } : {}),
      ...(input.taxRateBps !== undefined ? { taxRateBps: input.taxRateBps } : {}),
      ...(input.commissionRateBps !== undefined
        ? { commissionRateBps: input.commissionRateBps }
        : {}),
      ...(customerUsageCount !== undefined ? { customerUsageCount } : {}),
      ...(input.at !== undefined ? { at: input.at } : {}),
    });
  }

  public async recordUsage(input: {
    readonly promotionId: string;
    readonly customerId?: string;
    readonly orderId: string;
    readonly idempotencyKey: string;
  }): Promise<void> {
    const promotion = await this.promotions.findById(input.promotionId);
    if (!promotion) {
      throw new PromotionNotFoundError();
    }
    await this.promotions.recordUsage({
      promotion,
      customerId: input.customerId ?? null,
      orderId: input.orderId,
      idempotencyKey: input.idempotencyKey,
    });
  }
}
