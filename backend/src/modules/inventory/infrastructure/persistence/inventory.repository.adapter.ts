import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/core';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type {
  InventoryMutationUnitOfWork,
  InventoryRepository,
} from '../../application/ports/inventory-repository.interface';
import type { InventoryItem } from '../../domain/aggregates/inventory-item.aggregate';
import type { InventoryReservation } from '../../domain/aggregates/inventory-reservation.aggregate';
import type { InventoryMovementRecord } from '../../domain/entities/inventory-movement';
import { applyInventoryItemToOrm, inventoryItemToDomain } from './inventory-item.mapper';
import { InventoryItemOrmEntity } from './inventory-item.orm-entity';
import { InventoryMovementOrmEntity } from './inventory-movement.orm-entity';
import { InventoryOperationOrmEntity } from './inventory-operation.orm-entity';
import { InventoryOutboxOrmEntity } from './inventory-outbox.orm-entity';
import { applyReservationToOrm, reservationToDomain } from './inventory-reservation.mapper';
import { InventoryReservationOrmEntity } from './inventory-reservation.orm-entity';

class MikroInventoryUnitOfWork implements InventoryMutationUnitOfWork {
  constructor(private readonly tx: EntityManager) {}

  public async saveItem(item: InventoryItem): Promise<void> {
    const existing = await this.tx.findOne(InventoryItemOrmEntity, { id: item.id.value });
    const entity = existing ?? new InventoryItemOrmEntity();
    applyInventoryItemToOrm(item, entity);
    await this.tx.persist(entity).flush();
    for (const event of item.getUncommittedEvents()) {
      const outbox = new InventoryOutboxOrmEntity();
      outbox.id = UniqueID.create().value;
      outbox.aggregateId = item.id.value;
      outbox.eventType = event.eventName;
      outbox.payloadJson = {
        ...event.payload,
        storeId: item.storeId,
        vendorId: item.vendorId,
        variantId: item.variantId,
      };
      outbox.eventVersion = 1;
      outbox.createdAt = event.occurredAt;
      outbox.publishedAt = null;
      outbox.retryCount = 0;
      await this.tx.persist(outbox).flush();
    }
    item.clearEvents();
  }

  public async saveReservation(reservation: InventoryReservation): Promise<void> {
    const existing = await this.tx.findOne(InventoryReservationOrmEntity, {
      id: reservation.id.value,
    });
    const entity = existing ?? new InventoryReservationOrmEntity();
    applyReservationToOrm(reservation, entity);
    await this.tx.persist(entity).flush();
  }

  public async appendMovement(movement: InventoryMovementRecord): Promise<void> {
    const entity = new InventoryMovementOrmEntity();
    entity.id = movement.id;
    entity.vendorId = movement.vendorId;
    entity.storeId = movement.storeId;
    entity.warehouseId = movement.warehouseId;
    entity.variantId = movement.variantId;
    entity.inventoryItemId = movement.inventoryItemId;
    entity.operationType = movement.operationType;
    entity.quantity = movement.quantity;
    entity.beforeQuantity = movement.beforeQuantity;
    entity.afterQuantity = movement.afterQuantity;
    entity.referenceType = movement.referenceType;
    entity.referenceId = movement.referenceId;
    entity.actorUserId = movement.actorUserId;
    entity.reason = movement.reason;
    entity.correlationId = movement.correlationId;
    entity.createdAt = movement.createdAt;
    await this.tx.persist(entity).flush();
  }

  public async findItemByWarehouseAndVariantForUpdate(
    warehouseId: string,
    variantId: string,
  ): Promise<InventoryItem | null> {
    const entity = await this.tx.findOne(
      InventoryItemOrmEntity,
      { warehouseId, variantId },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
    return entity ? inventoryItemToDomain(entity) : null;
  }

  public async findItemByIdForUpdate(id: string): Promise<InventoryItem | null> {
    const entity = await this.tx.findOne(
      InventoryItemOrmEntity,
      { id },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
    return entity ? inventoryItemToDomain(entity) : null;
  }

  public async findReservationByIdForUpdate(id: string): Promise<InventoryReservation | null> {
    const entity = await this.tx.findOne(
      InventoryReservationOrmEntity,
      { id },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
    return entity ? reservationToDomain(entity) : null;
  }

  public async findExpiredActiveReservations(
    now: Date,
    limit: number,
  ): Promise<InventoryReservation[]> {
    const entities = await this.tx.find(
      InventoryReservationOrmEntity,
      {
        status: 'ACTIVE',
        expiresAt: { $lte: now },
      },
      { limit, orderBy: { expiresAt: 'ASC' }, lockMode: LockMode.PESSIMISTIC_WRITE },
    );
    return entities.map(reservationToDomain);
  }
}

@Injectable()
export class InventoryRepositoryAdapter implements InventoryRepository {
  constructor(private readonly em: EntityManager) {}

  public async saveItem(item: InventoryItem): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(InventoryItemOrmEntity, { id: item.id.value });
      const entity = existing ?? new InventoryItemOrmEntity();
      applyInventoryItemToOrm(item, entity);
      await tx.persist(entity).flush();
      for (const event of item.getUncommittedEvents()) {
        const outbox = new InventoryOutboxOrmEntity();
        outbox.id = UniqueID.create().value;
        outbox.aggregateId = item.id.value;
        outbox.eventType = event.eventName;
        outbox.payloadJson = {
          ...event.payload,
          storeId: item.storeId,
          vendorId: item.vendorId,
          variantId: item.variantId,
        };
        outbox.eventVersion = 1;
        outbox.createdAt = event.occurredAt;
        outbox.publishedAt = null;
        outbox.retryCount = 0;
        await tx.persist(outbox).flush();
      }
      item.clearEvents();
    });
  }

  public async findItemById(id: string): Promise<InventoryItem | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(InventoryItemOrmEntity, { id });
      return entity ? inventoryItemToDomain(entity) : null;
    });
  }

  public async findItemByWarehouseAndVariant(
    warehouseId: string,
    variantId: string,
  ): Promise<InventoryItem | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(InventoryItemOrmEntity, { warehouseId, variantId });
      return entity ? inventoryItemToDomain(entity) : null;
    });
  }

  public async findItemsByStoreAndVariant(
    storeId: string,
    variantId: string,
  ): Promise<InventoryItem[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(InventoryItemOrmEntity, { storeId, variantId });
      return entities.map(inventoryItemToDomain);
    });
  }

  public async findReservationById(id: string): Promise<InventoryReservation | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(InventoryReservationOrmEntity, { id });
      return entity ? reservationToDomain(entity) : null;
    });
  }

  public async withLockedUnitOfWork<T>(
    work: (uow: InventoryMutationUnitOfWork) => Promise<T>,
  ): Promise<T> {
    return withRlsContext(this.em, async (tx) => {
      const uow = new MikroInventoryUnitOfWork(tx);
      return work(uow);
    });
  }

  public async findCompletedOperation(
    idempotencyKey: string,
  ): Promise<Record<string, unknown> | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(InventoryOperationOrmEntity, {
        idempotencyKey,
        status: 'COMPLETED',
      });
      return entity?.resultJson ?? null;
    });
  }

  public async recordCompletedOperation(input: {
    readonly idempotencyKey: string;
    readonly operationType: string;
    readonly referenceId?: string | null;
    readonly result: Record<string, unknown>;
  }): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(InventoryOperationOrmEntity, {
        idempotencyKey: input.idempotencyKey,
      });
      if (existing) {
        return;
      }
      const entity = new InventoryOperationOrmEntity();
      entity.id = UniqueID.create().value;
      entity.idempotencyKey = input.idempotencyKey;
      entity.operationType = input.operationType;
      entity.referenceId = input.referenceId ?? null;
      entity.resultJson = input.result;
      entity.status = 'COMPLETED';
      entity.createdAt = new Date();
      await tx.persist(entity).flush();
    });
  }
}
