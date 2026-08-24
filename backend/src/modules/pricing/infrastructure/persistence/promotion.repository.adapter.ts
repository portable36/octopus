import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode, UniqueConstraintViolationException } from '@mikro-orm/core';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { PromotionRepository } from '../../application/ports/promotion-repository.interface';
import type { Promotion } from '../../domain/aggregates/promotion.aggregate';
import { CouponUsageLimitReachedError } from '../../domain/errors/pricing.errors';
import { applyPromotionToOrm, promotionToDomain } from './promotion.mapper';
import { PromotionOrmEntity, PromotionUsageOrmEntity } from './promotion.orm-entity';

@Injectable()
export class PromotionRepositoryAdapter implements PromotionRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(promotion: Promotion): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(PromotionOrmEntity, { id: promotion.id.value });
      const entity = existing ?? new PromotionOrmEntity();
      applyPromotionToOrm(promotion, entity);
      await tx.persist(entity).flush();
    });
  }

  public async findById(id: string): Promise<Promotion | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(PromotionOrmEntity, { id });
      return entity ? promotionToDomain(entity) : null;
    });
  }

  public async findByCouponCode(vendorId: string, couponCode: string): Promise<Promotion | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(PromotionOrmEntity, {
        vendorId,
        couponCode: couponCode.trim().toUpperCase(),
      });
      return entity ? promotionToDomain(entity) : null;
    });
  }

  public async listByStore(storeId: string): Promise<Promotion[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        PromotionOrmEntity,
        { storeId },
        { orderBy: { createdAt: 'DESC' } },
      );
      return entities.map(promotionToDomain);
    });
  }

  public async countCustomerUsage(promotionId: string, customerId: string): Promise<number> {
    return withRlsContext(this.em, async (tx) => {
      return tx.count(PromotionUsageOrmEntity, { promotionId, customerId });
    });
  }

  public async recordUsage(input: {
    readonly promotion: Promotion;
    readonly customerId: string | null;
    readonly orderId: string;
    readonly idempotencyKey: string;
  }): Promise<{ readonly alreadyProcessed: boolean }> {
    return withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(PromotionUsageOrmEntity, {
        idempotencyKey: input.idempotencyKey,
      });
      if (existing) {
        return { alreadyProcessed: true };
      }

      const locked = await tx.findOne(
        PromotionOrmEntity,
        { id: input.promotion.id.value },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!locked) {
        throw new Error('Promotion missing during usage recording.');
      }
      const promotion = promotionToDomain(locked);
      try {
        promotion.recordUsage();
      } catch (error) {
        if (error instanceof CouponUsageLimitReachedError) {
          throw error;
        }
        throw error;
      }
      applyPromotionToOrm(promotion, locked);

      const usage = new PromotionUsageOrmEntity();
      usage.id = UniqueID.create().value;
      usage.promotionId = promotion.id.value;
      usage.vendorId = promotion.vendorId;
      usage.storeId = promotion.storeId;
      usage.customerId = input.customerId;
      usage.orderId = input.orderId;
      usage.idempotencyKey = input.idempotencyKey;
      usage.createdAt = new Date();

      try {
        await tx.persist(locked).persist(usage).flush();
      } catch (error) {
        if (error instanceof UniqueConstraintViolationException) {
          return { alreadyProcessed: true };
        }
        throw error;
      }
      return { alreadyProcessed: false };
    });
  }
}
