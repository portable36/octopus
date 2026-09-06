import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { CourierProvider } from '../../domain/fulfillment.types';
import type { Shipment } from '../../domain/aggregates/shipment.aggregate';
import type { FulfillmentRepository } from '../../application/ports/fulfillment-repository.interface';
import { applyShipmentToOrm, shipmentLinesToOrm, shipmentToDomain } from './fulfillment.mapper';
import {
  FulfillmentOperationOrmEntity,
  FulfillmentOutboxOrmEntity,
  ShipmentLineOrmEntity,
  ShipmentOrmEntity,
} from './fulfillment.orm-entity';

@Injectable()
export class FulfillmentRepositoryAdapter implements FulfillmentRepository {
  constructor(private readonly em: EntityManager) {}

  public async findById(id: string): Promise<Shipment | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ShipmentOrmEntity, { id });
      if (!entity) {
        return null;
      }
      const lines = await tx.find(ShipmentLineOrmEntity, { shipmentId: id });
      return shipmentToDomain(entity, lines);
    });
  }

  public async findByIdempotencyKey(idempotencyKey: string): Promise<Shipment | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ShipmentOrmEntity, { idempotencyKey });
      if (!entity) {
        return null;
      }
      const lines = await tx.find(ShipmentLineOrmEntity, { shipmentId: entity.id });
      return shipmentToDomain(entity, lines);
    });
  }

  public async findByOrderId(orderId: string): Promise<Shipment[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        ShipmentOrmEntity,
        { orderId },
        { orderBy: { createdAt: 'ASC' } },
      );
      if (entities.length === 0) {
        return [];
      }
      const shipmentIds = entities.map((e) => e.id);
      const allLines = await tx.find(ShipmentLineOrmEntity, { shipmentId: { $in: shipmentIds } });
      const linesByShipment = new Map<string, ShipmentLineOrmEntity[]>();
      for (const line of allLines) {
        const list = linesByShipment.get(line.shipmentId) ?? [];
        list.push(line);
        linesByShipment.set(line.shipmentId, list);
      }
      return entities.map((entity) =>
        shipmentToDomain(entity, linesByShipment.get(entity.id) ?? []),
      );
    });
  }

  public async findActiveCourierShipments(limit: number): Promise<Shipment[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        ShipmentOrmEntity,
        {
          provider: { $in: ['STEADFAST', 'PATHAO'] },
          status: { $nin: ['DELIVERED', 'FAILED', 'RETURNED'] },
        },
        {
          orderBy: { updatedAt: 'ASC' },
          limit,
        },
      );
      if (entities.length === 0) {
        return [];
      }
      const shipmentIds = entities.map((e) => e.id);
      const allLines = await tx.find(ShipmentLineOrmEntity, { shipmentId: { $in: shipmentIds } });
      const linesByShipment = new Map<string, ShipmentLineOrmEntity[]>();
      for (const line of allLines) {
        const list = linesByShipment.get(line.shipmentId) ?? [];
        list.push(line);
        linesByShipment.set(line.shipmentId, list);
      }
      return entities.map((entity) =>
        shipmentToDomain(entity, linesByShipment.get(entity.id) ?? []),
      );
    });
  }

  public async findByProviderReference(
    provider: CourierProvider,
    referenceId: string,
  ): Promise<Shipment | null> {
    const trimmed = referenceId.trim();
    if (!trimmed) {
      return null;
    }
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ShipmentOrmEntity, {
        provider,
        $or: [
          { providerConsignmentId: trimmed },
          { trackingCode: trimmed },
          { merchantOrderRef: trimmed },
        ],
      });
      if (!entity) {
        return null;
      }
      const lines = await tx.find(ShipmentLineOrmEntity, { shipmentId: entity.id });
      return shipmentToDomain(entity, lines);
    });
  }

  public async save(shipment: Shipment, idempotencyKey: string): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(ShipmentOrmEntity, { id: shipment.id.value });
      const isNew = !entity;
      if (!entity) {
        entity = new ShipmentOrmEntity();
      }
      applyShipmentToOrm(shipment, entity, idempotencyKey);
      await tx.persist(entity).flush();

      if (!isNew) {
        await tx.nativeDelete(ShipmentLineOrmEntity, { shipmentId: shipment.id.value });
      }
      for (const line of shipmentLinesToOrm(shipment)) {
        await tx.persist(line);
      }
      await tx.flush();

      for (const event of shipment.getUncommittedEvents()) {
        const outbox = new FulfillmentOutboxOrmEntity();
        outbox.id = UniqueID.create().value;
        outbox.aggregateId = shipment.id.value;
        outbox.eventType = event.eventName;
        outbox.payloadJson = event.payload;
        outbox.eventVersion = 1;
        outbox.createdAt = new Date();
        outbox.publishedAt = null;
        await tx.persist(outbox).flush();
      }
      shipment.clearEvents();
    });
  }

  public async findOperation(
    idempotencyKey: string,
  ): Promise<{ requestHash: string; responseJson: Record<string, unknown> } | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(FulfillmentOperationOrmEntity, { idempotencyKey });
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
      const entity = new FulfillmentOperationOrmEntity();
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
