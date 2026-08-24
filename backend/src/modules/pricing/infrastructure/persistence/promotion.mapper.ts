import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Promotion } from '../../domain/aggregates/promotion.aggregate';
import { PromotionOrmEntity } from './promotion.orm-entity';

export function promotionToDomain(entity: PromotionOrmEntity): Promotion {
  return Promotion.reconstitute(UniqueID.from(entity.id), {
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    name: entity.name,
    couponCode: entity.couponCode,
    discountType: entity.discountType,
    discountValue: entity.discountValue,
    currencyCode: entity.currencyCode,
    minOrderAmountMinor: entity.minOrderAmountMinor,
    scope: entity.scope,
    scopeIds: Object.freeze([...entity.scopeIds]),
    usageLimit: entity.usageLimit,
    usageCount: entity.usageCount,
    perCustomerLimit: entity.perCustomerLimit,
    startsAt: entity.startsAt,
    endsAt: entity.endsAt,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function applyPromotionToOrm(promotion: Promotion, entity: PromotionOrmEntity): void {
  entity.id = promotion.id.value;
  entity.vendorId = promotion.vendorId;
  entity.storeId = promotion.storeId;
  entity.name = promotion.name;
  entity.couponCode = promotion.couponCode;
  entity.discountType = promotion.discountType;
  entity.discountValue = promotion.discountValue;
  entity.currencyCode = promotion.currencyCode;
  entity.minOrderAmountMinor = promotion.minOrderAmountMinor;
  entity.scope = promotion.scope;
  entity.scopeIds = [...promotion.scopeIds];
  entity.usageLimit = promotion.usageLimit;
  entity.usageCount = promotion.usageCount;
  entity.perCustomerLimit = promotion.perCustomerLimit;
  entity.startsAt = promotion.startsAt;
  entity.endsAt = promotion.endsAt;
  entity.status = promotion.status;
  entity.createdAt = promotion.createdAt;
  entity.updatedAt = promotion.updatedAt;
}
