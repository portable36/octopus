import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { ReturnRequest } from '../../domain/aggregates/return-request.aggregate';
import type {
  ReturnLineQuantityRow,
  ReturnsRepository,
} from '../../application/ports/returns-repository.interface';
import { applyReturnRequestToOrm, returnRequestToDomain } from './returns.mapper';
import {
  ReturnOperationOrmEntity,
  ReturnRequestOrmEntity,
  ReturnsOutboxOrmEntity,
} from './returns.orm-entity';

@Injectable()
export class ReturnsRepositoryAdapter implements ReturnsRepository {
  constructor(private readonly em: EntityManager) {}

  public async findById(id: string): Promise<ReturnRequest | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ReturnRequestOrmEntity, { id });
      return entity ? returnRequestToDomain(entity) : null;
    });
  }

  public async listByOrderId(orderId: string): Promise<ReturnRequest[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        ReturnRequestOrmEntity,
        { orderId },
        { orderBy: { createdAt: 'DESC' } },
      );
      return rows.map(returnRequestToDomain);
    });
  }

  public async listByStoreId(storeId: string): Promise<ReturnRequest[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        ReturnRequestOrmEntity,
        { storeId },
        { orderBy: { createdAt: 'DESC' }, limit: 100 },
      );
      return rows.map(returnRequestToDomain);
    });
  }

  public async listQuantityRowsByOrderId(orderId: string): Promise<ReturnLineQuantityRow[]> {
    const returns = await this.listByOrderId(orderId);
    return returns.flatMap((ret) =>
      ret.items.map((item) => ({
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        status: ret.status,
      })),
    );
  }

  public async save(returnRequest: ReturnRequest): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(ReturnRequestOrmEntity, { id: returnRequest.id.value });
      if (!entity) {
        entity = new ReturnRequestOrmEntity();
      }
      applyReturnRequestToOrm(returnRequest, entity);
      await tx.persist(entity).flush();
      for (const event of returnRequest.getUncommittedEvents()) {
        const outbox = new ReturnsOutboxOrmEntity();
        outbox.id = UniqueID.create().value;
        outbox.aggregateId = returnRequest.id.value;
        outbox.eventType = event.eventName;
        outbox.payloadJson = event.payload;
        outbox.eventVersion = 1;
        outbox.createdAt = new Date();
        outbox.publishedAt = null;
        outbox.retryCount = 0;
        await tx.persist(outbox).flush();
      }
      returnRequest.clearEvents();
    });
  }

  public async findOperation(
    idempotencyKey: string,
  ): Promise<{ requestHash: string; responseJson: Record<string, unknown> } | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ReturnOperationOrmEntity, { idempotencyKey });
      if (!entity) {
        return null;
      }
      return { requestHash: entity.requestHash, responseJson: entity.responseJson };
    });
  }

  public async saveOperation(input: {
    readonly idempotencyKey: string;
    readonly operationType: string;
    readonly requestHash: string;
    readonly responseJson: Record<string, unknown>;
  }): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const entity = new ReturnOperationOrmEntity();
      entity.id = UniqueID.create().value;
      entity.idempotencyKey = input.idempotencyKey;
      entity.operationType = input.operationType;
      entity.requestHash = input.requestHash;
      entity.responseJson = input.responseJson;
      entity.createdAt = new Date();
      try {
        await tx.persist(entity).flush();
      } catch (error) {
        if (!(error instanceof UniqueConstraintViolationException)) {
          throw error;
        }
      }
    });
  }
}
