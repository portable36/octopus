import { Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { CheckoutRepository } from '../../application/ports/checkout-repository.interface';
import type { CheckoutOutcome } from '../../domain/checkout.types';
import { CheckoutSubmissionOrmEntity } from './checkout.orm-entity';

@Injectable()
export class CheckoutRepositoryAdapter implements CheckoutRepository {
  constructor(private readonly em: EntityManager) {}

  public async findCompletedByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<CheckoutOutcome | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CheckoutSubmissionOrmEntity, {
        idempotencyKey,
        status: 'COMPLETED',
      });
      if (!entity) {
        return null;
      }
      return entity.outcomeJson as unknown as CheckoutOutcome;
    });
  }

  public async saveCompleted(input: {
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly customerId: string | null;
    readonly guestToken: string | null;
    readonly outcome: CheckoutOutcome;
  }): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(CheckoutSubmissionOrmEntity, {
        idempotencyKey: input.idempotencyKey,
      });
      if (existing) {
        return;
      }
      const entity = new CheckoutSubmissionOrmEntity();
      entity.id = UniqueID.create().value;
      entity.idempotencyKey = input.idempotencyKey;
      entity.requestHash = input.requestHash;
      entity.customerId = input.customerId;
      entity.guestToken = input.guestToken;
      entity.cartId = input.outcome.cartId;
      entity.outcomeJson = input.outcome as unknown as Record<string, unknown>;
      entity.status = 'COMPLETED';
      entity.createdAt = new Date();
      try {
        await tx.persist(entity).flush();
      } catch (error) {
        if (error instanceof UniqueConstraintViolationException) {
          return;
        }
        throw error;
      }
    });
  }
}
