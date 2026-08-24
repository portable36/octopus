import { Inject, Injectable } from '@nestjs/common';
import type {
  CatalogVariantAccessPort,
  CatalogVariantAccessSnapshot,
} from '../../../../shared-kernel/application/ports/catalog-variant-access.port';
import { CATALOG_VARIANT_ACCESS } from '../../../../shared-kernel/application/ports/catalog-variant-access.port';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { InventoryItem } from '../../domain/aggregates/inventory-item.aggregate';
import { InventoryReservation } from '../../domain/aggregates/inventory-reservation.aggregate';
import { Warehouse } from '../../domain/aggregates/warehouse.aggregate';
import { createMovement } from '../../domain/entities/inventory-movement';
import type { InventoryOperationType, InventoryReferenceType } from '../../domain/inventory.types';
import { stockStatus } from '../../domain/inventory.types';
import {
  CrossStoreTransferDeniedError,
  InventoryItemNotFoundError,
  ReservationNotFoundError,
  VariantNotFoundForInventoryError,
  WarehouseCodeTakenError,
} from '../errors/inventory.errors';
import {
  INVENTORY_REPOSITORY,
  type InventoryRepository,
} from '../ports/inventory-repository.interface';
import {
  WAREHOUSE_REPOSITORY,
  type WarehouseRepository,
} from '../ports/warehouse-repository.interface';
import { InventoryAuthorizationService } from '../services/inventory-authorization.service';

@Injectable()
export class WarehouseCommandHandler {
  constructor(
    @Inject(WAREHOUSE_REPOSITORY) private readonly warehouses: WarehouseRepository,
    private readonly auth: InventoryAuthorizationService,
  ) {}

  public async create(input: {
    readonly storeId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly code: string;
    readonly name: string;
    readonly addressLine?: string | null;
  }): Promise<Warehouse> {
    const store = await this.auth.requireMutator(
      input.storeId,
      input.actorUserId,
      input.actorRoles,
    );
    const existing = await this.warehouses.findByStoreAndCode(input.storeId, input.code);
    if (existing) {
      throw new WarehouseCodeTakenError();
    }
    const warehouse = Warehouse.create({
      vendorId: store.vendorId,
      storeId: store.storeId,
      code: input.code,
      name: input.name,
      ...(input.addressLine !== undefined ? { addressLine: input.addressLine } : {}),
    });
    await this.warehouses.save(warehouse);
    return warehouse;
  }

  public async list(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Warehouse[]> {
    await this.auth.requireReader(storeId, actorUserId, actorRoles);
    return this.warehouses.findByStoreId(storeId);
  }
}

@Injectable()
export class StockCommandHandler {
  constructor(
    @Inject(INVENTORY_REPOSITORY) private readonly inventory: InventoryRepository,
    @Inject(WAREHOUSE_REPOSITORY) private readonly warehouses: WarehouseRepository,
    @Inject(CATALOG_VARIANT_ACCESS) private readonly variants: CatalogVariantAccessPort,
    private readonly auth: InventoryAuthorizationService,
  ) {}

  public async ensureItem(input: {
    readonly storeId: string;
    readonly warehouseId: string;
    readonly variantId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly lowStockThreshold?: number;
  }): Promise<InventoryItem> {
    const store = await this.auth.requireMutator(
      input.storeId,
      input.actorUserId,
      input.actorRoles,
    );
    const warehouse = await this.auth.requireWarehouseForStore(input.warehouseId, input.storeId);
    warehouse.assertActive();
    const variant = await this.requireVariantForVendor(input.variantId, store.vendorId);

    const existing = await this.inventory.findItemByWarehouseAndVariant(
      warehouse.id.value,
      variant.variantId,
    );
    if (existing) {
      return existing;
    }

    const item = InventoryItem.create({
      vendorId: store.vendorId,
      storeId: store.storeId,
      warehouseId: warehouse.id.value,
      variantId: variant.variantId,
      ...(input.lowStockThreshold !== undefined
        ? { lowStockThreshold: input.lowStockThreshold }
        : {}),
    });
    await this.inventory.saveItem(item);
    return item;
  }

  public async receive(input: {
    readonly storeId: string;
    readonly warehouseId: string;
    readonly variantId: string;
    readonly quantity: number;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly reason?: string;
    readonly idempotencyKey: string;
    readonly correlationId?: string;
  }): Promise<InventoryItem> {
    return this.mutateOnHand({
      storeId: input.storeId,
      warehouseId: input.warehouseId,
      variantId: input.variantId,
      quantity: input.quantity,
      actorUserId: input.actorUserId,
      actorRoles: input.actorRoles,
      idempotencyKey: input.idempotencyKey,
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
      operationType: 'RECEIVE',
      apply: (item) => item.receive(input.quantity),
      quantityField: 'onHand',
    });
  }

  public async adjust(input: {
    readonly storeId: string;
    readonly warehouseId: string;
    readonly variantId: string;
    readonly delta: number;
    readonly reason: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly idempotencyKey: string;
    readonly correlationId?: string;
  }): Promise<InventoryItem> {
    return this.mutateOnHand({
      storeId: input.storeId,
      warehouseId: input.warehouseId,
      variantId: input.variantId,
      quantity: Math.abs(input.delta),
      actorUserId: input.actorUserId,
      actorRoles: input.actorRoles,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
      operationType: 'ADJUST',
      apply: (item) => item.adjust(input.delta, input.reason),
      quantityField: 'onHand',
    });
  }

  public async transfer(input: {
    readonly storeId: string;
    readonly sourceWarehouseId: string;
    readonly destinationWarehouseId: string;
    readonly variantId: string;
    readonly quantity: number;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly idempotencyKey: string;
    readonly correlationId?: string;
  }): Promise<{ source: InventoryItem; destination: InventoryItem }> {
    await this.auth.requireMutator(input.storeId, input.actorUserId, input.actorRoles);

    const prior = await this.inventory.findCompletedOperation(input.idempotencyKey);
    if (prior) {
      const source = await this.inventory.findItemById(String(prior['sourceItemId']));
      const destination = await this.inventory.findItemById(String(prior['destinationItemId']));
      if (source && destination) {
        return { source, destination };
      }
    }

    if (input.sourceWarehouseId === input.destinationWarehouseId) {
      throw new CrossStoreTransferDeniedError();
    }

    const sortedWarehouseIds = [input.sourceWarehouseId, input.destinationWarehouseId].sort(
      (a, b) => a.localeCompare(b),
    );
    const firstWhId = sortedWarehouseIds[0] as string;
    const secondWhId = sortedWarehouseIds[1] as string;
    const sourceWh = await this.auth.requireWarehouseForStore(
      input.sourceWarehouseId,
      input.storeId,
    );
    const destWh = await this.auth.requireWarehouseForStore(
      input.destinationWarehouseId,
      input.storeId,
    );
    if (sourceWh.storeId !== destWh.storeId) {
      throw new CrossStoreTransferDeniedError();
    }
    sourceWh.assertActive();
    destWh.assertActive();
    await this.requireVariantForVendor(input.variantId, sourceWh.vendorId);

    const transferId = UniqueID.create().value;

    const result = await this.inventory.withLockedUnitOfWork(async (uow) => {
      // Deterministic lock order by warehouse id
      await uow.findItemByWarehouseAndVariantForUpdate(firstWhId, input.variantId);
      await uow.findItemByWarehouseAndVariantForUpdate(secondWhId, input.variantId);

      const source = await uow.findItemByWarehouseAndVariantForUpdate(
        sourceWh.id.value,
        input.variantId,
      );
      if (!source) {
        throw new InventoryItemNotFoundError();
      }

      let destination = await uow.findItemByWarehouseAndVariantForUpdate(
        destWh.id.value,
        input.variantId,
      );
      if (!destination) {
        destination = InventoryItem.create({
          vendorId: destWh.vendorId,
          storeId: destWh.storeId,
          warehouseId: destWh.id.value,
          variantId: input.variantId,
        });
      }

      const out = source.transferOut(input.quantity);
      const inn = destination.transferIn(input.quantity);
      await uow.saveItem(source);
      await uow.saveItem(destination);
      await uow.appendMovement(
        createMovement({
          id: UniqueID.create().value,
          vendorId: source.vendorId,
          storeId: source.storeId,
          warehouseId: source.warehouseId,
          variantId: source.variantId,
          inventoryItemId: source.id.value,
          operationType: 'TRANSFER_OUT',
          quantity: input.quantity,
          beforeQuantity: out.before,
          afterQuantity: out.after,
          referenceType: 'TRANSFER',
          referenceId: transferId,
          actorUserId: input.actorUserId,
          reason: null,
          correlationId: input.correlationId ?? null,
        }),
      );
      await uow.appendMovement(
        createMovement({
          id: UniqueID.create().value,
          vendorId: destination.vendorId,
          storeId: destination.storeId,
          warehouseId: destination.warehouseId,
          variantId: destination.variantId,
          inventoryItemId: destination.id.value,
          operationType: 'TRANSFER_IN',
          quantity: input.quantity,
          beforeQuantity: inn.before,
          afterQuantity: inn.after,
          referenceType: 'TRANSFER',
          referenceId: transferId,
          actorUserId: input.actorUserId,
          reason: null,
          correlationId: input.correlationId ?? null,
        }),
      );
      return { source, destination };
    });

    await this.inventory.recordCompletedOperation({
      idempotencyKey: input.idempotencyKey,
      operationType: 'TRANSFER',
      referenceId: transferId,
      result: {
        sourceItemId: result.source.id.value,
        destinationItemId: result.destination.id.value,
      },
    });
    return result;
  }

  public async getAvailability(input: {
    readonly storeId: string;
    readonly variantId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<{
    readonly variantId: string;
    readonly onHand: number;
    readonly reserved: number;
    readonly available: number;
    readonly stockStatus: ReturnType<typeof stockStatus>;
    readonly locations: Array<{
      warehouseId: string;
      warehouseName: string;
      onHand: number;
      reserved: number;
      available: number;
      stockStatus: ReturnType<typeof stockStatus>;
    }>;
  }> {
    await this.auth.requireReader(input.storeId, input.actorUserId, input.actorRoles);
    const items = await this.inventory.findItemsByStoreAndVariant(input.storeId, input.variantId);
    const warehouses = await this.warehouses.findByStoreId(input.storeId);
    const byId = new Map(warehouses.map((w) => [w.id.value, w]));
    const locations = items.map((item) => {
      const wh = byId.get(item.warehouseId);
      return {
        warehouseId: item.warehouseId,
        warehouseName: wh?.name ?? item.warehouseId,
        onHand: item.onHand,
        reserved: item.reserved,
        available: item.available,
        stockStatus: stockStatus(item.available, item.lowStockThreshold),
      };
    });
    const onHand = locations.reduce((sum, row) => sum + row.onHand, 0);
    const reserved = locations.reduce((sum, row) => sum + row.reserved, 0);
    const available = onHand - reserved;
    const maxThreshold = items.reduce((max, item) => Math.max(max, item.lowStockThreshold), 0);
    return {
      variantId: input.variantId,
      onHand,
      reserved,
      available,
      stockStatus: stockStatus(available, maxThreshold),
      locations,
    };
  }

  private async mutateOnHand(input: {
    readonly storeId: string;
    readonly warehouseId: string;
    readonly variantId: string;
    readonly quantity: number;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly reason?: string;
    readonly idempotencyKey: string;
    readonly correlationId?: string;
    readonly operationType: InventoryOperationType;
    readonly apply: (item: InventoryItem) => { before: number; after: number };
    readonly quantityField: 'onHand';
  }): Promise<InventoryItem> {
    await this.auth.requireMutator(input.storeId, input.actorUserId, input.actorRoles);

    const prior = await this.inventory.findCompletedOperation(input.idempotencyKey);
    if (prior?.['inventoryItemId']) {
      const existing = await this.inventory.findItemById(String(prior['inventoryItemId']));
      if (existing) {
        return existing;
      }
    }

    const warehouse = await this.auth.requireWarehouseForStore(input.warehouseId, input.storeId);
    warehouse.assertActive();
    await this.requireVariantForVendor(input.variantId, warehouse.vendorId);

    const item = await this.inventory.withLockedUnitOfWork(async (uow) => {
      let current = await uow.findItemByWarehouseAndVariantForUpdate(
        warehouse.id.value,
        input.variantId,
      );
      if (!current) {
        current = InventoryItem.create({
          vendorId: warehouse.vendorId,
          storeId: warehouse.storeId,
          warehouseId: warehouse.id.value,
          variantId: input.variantId,
        });
        await uow.saveItem(current);
        current =
          (await uow.findItemByIdForUpdate(current.id.value)) ??
          (await uow.findItemByWarehouseAndVariantForUpdate(warehouse.id.value, input.variantId))!;
      }
      const change = input.apply(current);
      await uow.saveItem(current);
      await uow.appendMovement(
        createMovement({
          id: UniqueID.create().value,
          vendorId: current.vendorId,
          storeId: current.storeId,
          warehouseId: current.warehouseId,
          variantId: current.variantId,
          inventoryItemId: current.id.value,
          operationType: input.operationType,
          quantity: input.quantity,
          beforeQuantity: change.before,
          afterQuantity: change.after,
          referenceType: 'MANUAL' satisfies InventoryReferenceType,
          referenceId: input.idempotencyKey,
          actorUserId: input.actorUserId,
          reason: input.reason ?? null,
          correlationId: input.correlationId ?? null,
        }),
      );
      return current;
    });

    await this.inventory.recordCompletedOperation({
      idempotencyKey: input.idempotencyKey,
      operationType: input.operationType,
      referenceId: item.id.value,
      result: { inventoryItemId: item.id.value },
    });
    return item;
  }

  private async requireVariantForVendor(
    variantId: string,
    vendorId: string,
  ): Promise<CatalogVariantAccessSnapshot> {
    const variant = await this.variants.findById(variantId);
    if (!variant || variant.vendorId !== vendorId) {
      throw new VariantNotFoundForInventoryError();
    }
    return variant;
  }
}

@Injectable()
export class ReservationCommandHandler {
  constructor(
    @Inject(INVENTORY_REPOSITORY) private readonly inventory: InventoryRepository,
    @Inject(WAREHOUSE_REPOSITORY) private readonly warehouses: WarehouseRepository,
    private readonly auth: InventoryAuthorizationService,
  ) {}

  public async reserve(input: {
    readonly storeId: string;
    readonly warehouseId: string;
    readonly variantId: string;
    readonly quantity: number;
    readonly orderId: string;
    readonly expiresAt: Date;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly idempotencyKey: string;
    readonly correlationId?: string;
  }): Promise<{ reservationId: string; availableAfter: number }> {
    await this.auth.requireMutator(input.storeId, input.actorUserId, input.actorRoles);

    const prior = await this.inventory.findCompletedOperation(input.idempotencyKey);
    if (prior?.['reservationId']) {
      return {
        reservationId: String(prior['reservationId']),
        availableAfter: Number(prior['availableAfter'] ?? 0),
      };
    }

    const warehouse = await this.auth.requireWarehouseForStore(input.warehouseId, input.storeId);
    warehouse.assertActive();

    const result = await this.inventory.withLockedUnitOfWork(async (uow) => {
      const item = await uow.findItemByWarehouseAndVariantForUpdate(
        warehouse.id.value,
        input.variantId,
      );
      if (!item) {
        throw new InventoryItemNotFoundError();
      }
      const reserved = item.reserve(input.quantity);
      const reservation = InventoryReservation.createActive({
        vendorId: item.vendorId,
        storeId: item.storeId,
        warehouseId: item.warehouseId,
        variantId: item.variantId,
        inventoryItemId: item.id.value,
        orderId: input.orderId,
        quantity: input.quantity,
        expiresAt: input.expiresAt,
      });
      await uow.saveItem(item);
      await uow.saveReservation(reservation);
      await uow.appendMovement(
        createMovement({
          id: UniqueID.create().value,
          vendorId: item.vendorId,
          storeId: item.storeId,
          warehouseId: item.warehouseId,
          variantId: item.variantId,
          inventoryItemId: item.id.value,
          operationType: 'RESERVE',
          quantity: input.quantity,
          beforeQuantity: reserved.beforeReserved,
          afterQuantity: reserved.afterReserved,
          referenceType: 'RESERVATION',
          referenceId: reservation.id.value,
          actorUserId: input.actorUserId,
          reason: null,
          correlationId: input.correlationId ?? null,
        }),
      );
      return { reservationId: reservation.id.value, availableAfter: item.available };
    });

    await this.inventory.recordCompletedOperation({
      idempotencyKey: input.idempotencyKey,
      operationType: 'RESERVE',
      referenceId: result.reservationId,
      result,
    });
    return result;
  }

  public async release(input: {
    readonly reservationId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly idempotencyKey: string;
    readonly correlationId?: string;
  }): Promise<void> {
    const prior = await this.inventory.findCompletedOperation(input.idempotencyKey);
    if (prior) {
      return;
    }

    await this.inventory.withLockedUnitOfWork(async (uow) => {
      const reservation = await uow.findReservationByIdForUpdate(input.reservationId);
      if (!reservation) {
        throw new ReservationNotFoundError();
      }
      await this.auth.requireMutator(reservation.storeId, input.actorUserId, input.actorRoles);
      const item = await uow.findItemByIdForUpdate(reservation.inventoryItemId);
      if (!item) {
        throw new InventoryItemNotFoundError();
      }
      reservation.release();
      const released = item.release(reservation.quantity);
      await uow.saveReservation(reservation);
      await uow.saveItem(item);
      await uow.appendMovement(
        createMovement({
          id: UniqueID.create().value,
          vendorId: item.vendorId,
          storeId: item.storeId,
          warehouseId: item.warehouseId,
          variantId: item.variantId,
          inventoryItemId: item.id.value,
          operationType: 'RELEASE',
          quantity: reservation.quantity,
          beforeQuantity: released.beforeReserved,
          afterQuantity: released.afterReserved,
          referenceType: 'RESERVATION',
          referenceId: reservation.id.value,
          actorUserId: input.actorUserId,
          reason: null,
          correlationId: input.correlationId ?? null,
        }),
      );
    });

    await this.inventory.recordCompletedOperation({
      idempotencyKey: input.idempotencyKey,
      operationType: 'RELEASE',
      referenceId: input.reservationId,
      result: { ok: true },
    });
  }

  public async commit(input: {
    readonly reservationId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly idempotencyKey: string;
    readonly correlationId?: string;
  }): Promise<void> {
    const prior = await this.inventory.findCompletedOperation(input.idempotencyKey);
    if (prior) {
      return;
    }

    await this.inventory.withLockedUnitOfWork(async (uow) => {
      const reservation = await uow.findReservationByIdForUpdate(input.reservationId);
      if (!reservation) {
        throw new ReservationNotFoundError();
      }
      await this.auth.requireMutator(reservation.storeId, input.actorUserId, input.actorRoles);
      const item = await uow.findItemByIdForUpdate(reservation.inventoryItemId);
      if (!item) {
        throw new InventoryItemNotFoundError();
      }
      reservation.consume();
      const deducted = item.deduct(reservation.quantity);
      await uow.saveReservation(reservation);
      await uow.saveItem(item);
      await uow.appendMovement(
        createMovement({
          id: UniqueID.create().value,
          vendorId: item.vendorId,
          storeId: item.storeId,
          warehouseId: item.warehouseId,
          variantId: item.variantId,
          inventoryItemId: item.id.value,
          operationType: 'DEDUCT',
          quantity: reservation.quantity,
          beforeQuantity: deducted.beforeOnHand,
          afterQuantity: deducted.afterOnHand,
          referenceType: 'ORDER',
          referenceId: reservation.orderId,
          actorUserId: input.actorUserId,
          reason: null,
          correlationId: input.correlationId ?? null,
        }),
      );
    });

    await this.inventory.recordCompletedOperation({
      idempotencyKey: input.idempotencyKey,
      operationType: 'DEDUCT',
      referenceId: input.reservationId,
      result: { ok: true },
    });
  }

  public async expireDue(limit = 50): Promise<number> {
    let expired = 0;
    await this.inventory.withLockedUnitOfWork(async (uow) => {
      const due = await uow.findExpiredActiveReservations(new Date(), limit);
      for (const reservation of due) {
        const locked = await uow.findReservationByIdForUpdate(reservation.id.value);
        if (!locked || locked.status !== 'ACTIVE') {
          continue;
        }
        const item = await uow.findItemByIdForUpdate(locked.inventoryItemId);
        if (!item) {
          continue;
        }
        locked.expire();
        const released = item.release(locked.quantity);
        await uow.saveReservation(locked);
        await uow.saveItem(item);
        await uow.appendMovement(
          createMovement({
            id: UniqueID.create().value,
            vendorId: item.vendorId,
            storeId: item.storeId,
            warehouseId: item.warehouseId,
            variantId: item.variantId,
            inventoryItemId: item.id.value,
            operationType: 'EXPIRE',
            quantity: locked.quantity,
            beforeQuantity: released.beforeReserved,
            afterQuantity: released.afterReserved,
            referenceType: 'RESERVATION',
            referenceId: locked.id.value,
            actorUserId: null,
            reason: 'expired',
            correlationId: null,
          }),
        );
        expired += 1;
      }
    });
    return expired;
  }
}
