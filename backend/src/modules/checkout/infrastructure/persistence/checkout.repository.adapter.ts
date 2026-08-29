import { Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type {
  CheckoutIdempotencyClaim,
  CheckoutRepository,
} from '../../application/ports/checkout-repository.interface';
import type { CheckoutOutcome } from '../../domain/checkout.types';
import { CheckoutSubmissionOrmEntity } from './checkout.orm-entity';

@Injectable()
export class CheckoutRepositoryAdapter implements CheckoutRepository {
  constructor(private readonly em: EntityManager) {}

  public async claim(input: {
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly customerId: string | null;
    readonly guestToken: string | null;
    readonly cartId: string;
    readonly claimToken: string;
  }): Promise<CheckoutIdempotencyClaim> {
    return withRlsContext(this.em, async (tx) => {
      const entity = new CheckoutSubmissionOrmEntity();
      entity.id = UniqueID.create().value;
      entity.idempotencyKey = input.idempotencyKey;
      entity.requestHash = input.requestHash;
      entity.customerId = input.customerId;
      entity.guestToken = input.guestToken;
      entity.cartId = input.cartId;
      entity.outcomeJson = null;
      entity.status = 'IN_PROGRESS';
      entity.processingToken = input.claimToken;
      entity.createdAt = new Date();
      entity.updatedAt = entity.createdAt;

      await tx.getConnection().execute(
        `insert into "checkout_submissions"
          ("id", "idempotency_key", "request_hash", "customer_id", "guest_token",
           "cart_id", "outcome_json", "status", "processing_token", "created_at", "updated_at")
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict ("idempotency_key") do nothing`,
        [
          entity.id,
          entity.idempotencyKey,
          entity.requestHash,
          entity.customerId,
          entity.guestToken,
          entity.cartId,
          entity.outcomeJson,
          entity.status,
          entity.processingToken,
          entity.createdAt,
          entity.updatedAt,
        ],
      );

      const existing = await tx.findOne(CheckoutSubmissionOrmEntity, {
        idempotencyKey: input.idempotencyKey,
      });
      if (!existing) {
        throw new Error('Checkout idempotency claim could not be loaded.');
      }
      if (existing.requestHash !== input.requestHash) {
        return { status: 'IN_PROGRESS', requestHash: existing.requestHash };
      }
      if (existing.status === 'COMPLETED' && existing.outcomeJson) {
        return {
          status: 'COMPLETED',
          requestHash: existing.requestHash,
          outcome: existing.outcomeJson as unknown as CheckoutOutcome,
        };
      }
      if (existing.processingToken === input.claimToken) {
        return { status: 'CLAIMED', claimToken: input.claimToken };
      }
      return { status: 'IN_PROGRESS', requestHash: existing.requestHash };
    });
  }

  public async complete(input: {
    readonly idempotencyKey: string;
    readonly claimToken: string;
    readonly outcome: CheckoutOutcome;
  }): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CheckoutSubmissionOrmEntity, {
        idempotencyKey: input.idempotencyKey,
      });
      if (!entity || entity.processingToken !== input.claimToken) {
        throw new Error('Checkout idempotency claim is not owned by this request.');
      }
      entity.outcomeJson = input.outcome as unknown as Record<string, unknown>;
      entity.status = 'COMPLETED';
      entity.processingToken = null;
      entity.updatedAt = new Date();
      await tx.persist(entity).flush();
    });
  }

  public async release(input: {
    readonly idempotencyKey: string;
    readonly claimToken: string;
  }): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CheckoutSubmissionOrmEntity, {
        idempotencyKey: input.idempotencyKey,
      });
      if (entity?.processingToken === input.claimToken && entity.status === 'IN_PROGRESS') {
        tx.remove(entity);
        await tx.flush();
      }
    });
  }

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
      if (!existing) {
        const entity = new CheckoutSubmissionOrmEntity();
        entity.id = UniqueID.create().value;
        entity.idempotencyKey = input.idempotencyKey;
        entity.requestHash = input.requestHash;
        entity.customerId = input.customerId;
        entity.guestToken = input.guestToken;
        entity.cartId = input.outcome.cartId;
        entity.outcomeJson = input.outcome as unknown as Record<string, unknown>;
        entity.status = 'COMPLETED';
        entity.processingToken = null;
        entity.createdAt = new Date();
        entity.updatedAt = entity.createdAt;
        try {
          await tx.persist(entity).flush();
        } catch (error) {
          if (error instanceof UniqueConstraintViolationException) {
            return;
          }
          throw error;
        }
      }
    });
  }
}
