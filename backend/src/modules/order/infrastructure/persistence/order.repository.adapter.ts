import { Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { OrderRepository } from '../../application/ports/order-repository.interface';
import type { Order } from '../../domain/aggregates/order.aggregate';
import { applyOrderToOrm, orderLinesToOrm, orderToDomain } from './order.mapper';
import { OrderLineOrmEntity, OrderOrmEntity } from './order.orm-entity';
import { appendOrderOutbox } from './append-order-outbox';

@Injectable()
export class OrderRepositoryAdapter implements OrderRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(order: Order): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(OrderOrmEntity, { id: order.id.value });
      const entity = existing ?? new OrderOrmEntity();
      applyOrderToOrm(order, entity);
      try {
        await tx.persist(entity).flush();
      } catch (error) {
        if (error instanceof UniqueConstraintViolationException) {
          const raced = await tx.findOne(OrderOrmEntity, {
            idempotencyKey: order.idempotencyKey,
          });
          if (raced) {
            return;
          }
        }
        throw error;
      }

      await tx.nativeDelete(OrderLineOrmEntity, { orderId: order.id.value });
      for (const line of orderLinesToOrm(order)) {
        tx.persist(line);
      }
      await tx.flush();
      await appendOrderOutbox(tx, order.id.value, order.getUncommittedEvents());
      order.clearEvents();
    });
  }

  public async findById(id: string): Promise<Order | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(OrderOrmEntity, { id });
      if (!entity) {
        return null;
      }
      const lines = await tx.find(OrderLineOrmEntity, { orderId: id });
      return orderToDomain(entity, lines);
    });
  }

  public async findByIdempotencyKey(idempotencyKey: string): Promise<Order | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(OrderOrmEntity, { idempotencyKey });
      if (!entity) {
        return null;
      }
      const lines = await tx.find(OrderLineOrmEntity, { orderId: entity.id });
      return orderToDomain(entity, lines);
    });
  }

  public async listByCustomerId(customerId: string): Promise<Order[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        OrderOrmEntity,
        { customerId },
        { orderBy: { createdAt: 'DESC' } },
      );
      return this.hydrateMany(tx, entities);
    });
  }

  public async listByStoreId(storeId: string): Promise<Order[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        OrderOrmEntity,
        { storeId },
        { orderBy: { createdAt: 'DESC' } },
      );
      return this.hydrateMany(tx, entities);
    });
  }

  public async listRecent(limit: number): Promise<Order[]> {
    const capped = Math.min(Math.max(limit, 1), 200);
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        OrderOrmEntity,
        {},
        { orderBy: { createdAt: 'DESC' }, limit: capped },
      );
      // Admin ops list does not need line snapshots.
      return entities.map((entity) => orderToDomain(entity, []));
    });
  }

  private async hydrateMany(tx: EntityManager, entities: OrderOrmEntity[]): Promise<Order[]> {
    if (entities.length === 0) {
      return [];
    }
    const orderIds = entities.map((entity) => entity.id);
    const lines = await tx.find(OrderLineOrmEntity, { orderId: { $in: orderIds } });
    const linesByOrderId = new Map<string, OrderLineOrmEntity[]>();
    for (const line of lines) {
      const bucket = linesByOrderId.get(line.orderId) ?? [];
      bucket.push(line);
      linesByOrderId.set(line.orderId, bucket);
    }
    return entities.map((entity) => orderToDomain(entity, linesByOrderId.get(entity.id) ?? []));
  }
}
