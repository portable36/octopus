import type { Promotion } from '../../domain/aggregates/promotion.aggregate';

export const PROMOTION_REPOSITORY = Symbol('PROMOTION_REPOSITORY');

export interface PromotionRepository {
  save(promotion: Promotion): Promise<void>;
  findById(id: string): Promise<Promotion | null>;
  findByCouponCode(vendorId: string, couponCode: string): Promise<Promotion | null>;
  listByStore(storeId: string): Promise<Promotion[]>;
  countCustomerUsage(promotionId: string, customerId: string): Promise<number>;
  recordUsage(input: {
    readonly promotion: Promotion;
    readonly customerId: string | null;
    readonly orderId: string;
    readonly idempotencyKey: string;
  }): Promise<{ readonly alreadyProcessed: boolean }>;
}
