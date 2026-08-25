import { Inject, Injectable } from '@nestjs/common';
import type {
  AvailabilityQuery,
  AvailabilityResult,
  CommitInventoryInput,
  InventoryPort,
  ReleaseInventoryInput,
  ReservationResult,
  ReserveInventoryInput,
  RestoreFromReturnInput,
  RestoreFromReturnResult,
} from '../../../../shared-kernel/application/ports/inventory.port';
import {
  ReservationCommandHandler,
  StockCommandHandler,
} from '../../application/commands/inventory.handlers';
import {
  ReservationNotFoundError,
  WarehouseNotFoundError,
} from '../../application/errors/inventory.errors';
import {
  INVENTORY_REPOSITORY,
  type InventoryRepository,
} from '../../application/ports/inventory-repository.interface';
import {
  WAREHOUSE_REPOSITORY,
  type WarehouseRepository,
} from '../../application/ports/warehouse-repository.interface';

@Injectable()
export class InventoryPortAdapter implements InventoryPort {
  constructor(
    @Inject(INVENTORY_REPOSITORY) private readonly inventory: InventoryRepository,
    @Inject(WAREHOUSE_REPOSITORY) private readonly warehouses: WarehouseRepository,
    private readonly reservations: ReservationCommandHandler,
    private readonly stock: StockCommandHandler,
  ) {}

  public async checkAvailability(input: AvailabilityQuery): Promise<AvailabilityResult> {
    const item = await this.inventory.findItemByWarehouseAndVariant(
      input.warehouseId,
      input.variantId,
    );
    if (!item) {
      return {
        variantId: input.variantId,
        warehouseId: input.warehouseId,
        onHand: 0,
        reserved: 0,
        available: 0,
        status: 'MISSING',
      };
    }
    return {
      variantId: item.variantId,
      warehouseId: item.warehouseId,
      onHand: item.onHand,
      reserved: item.reserved,
      available: item.available,
      status: item.status,
    };
  }

  public async checkStoreAvailability(input: {
    readonly storeId: string;
    readonly variantId: string;
  }): Promise<{
    readonly storeId: string;
    readonly variantId: string;
    readonly available: number;
    readonly status: 'ACTIVE' | 'DISABLED' | 'MISSING';
  }> {
    const items = await this.inventory.findItemsByStoreAndVariant(input.storeId, input.variantId);
    if (items.length === 0) {
      return {
        storeId: input.storeId,
        variantId: input.variantId,
        available: 0,
        status: 'MISSING',
      };
    }
    const active = items.filter((item) => item.status === 'ACTIVE');
    if (active.length === 0) {
      return {
        storeId: input.storeId,
        variantId: input.variantId,
        available: 0,
        status: 'DISABLED',
      };
    }
    return {
      storeId: input.storeId,
      variantId: input.variantId,
      available: active.reduce((sum, item) => sum + item.available, 0),
      status: 'ACTIVE',
    };
  }

  public async pickWarehouseForReservation(input: {
    readonly storeId: string;
    readonly variantId: string;
    readonly quantity: number;
  }): Promise<{ readonly warehouseId: string; readonly available: number } | null> {
    const items = await this.inventory.findItemsByStoreAndVariant(input.storeId, input.variantId);
    const eligible = items
      .filter((item) => item.status === 'ACTIVE' && item.available >= input.quantity)
      .sort((a, b) => {
        if (b.available !== a.available) {
          return b.available - a.available;
        }
        return a.warehouseId.localeCompare(b.warehouseId);
      });
    const best = eligible[0];
    if (!best) {
      return null;
    }
    return { warehouseId: best.warehouseId, available: best.available };
  }

  public async reserve(input: ReserveInventoryInput): Promise<ReservationResult> {
    const warehouse = await this.warehouses.findById(input.warehouseId);
    if (!warehouse) {
      throw new WarehouseNotFoundError();
    }
    return this.reservations.reserve({
      storeId: warehouse.storeId,
      warehouseId: input.warehouseId,
      variantId: input.variantId,
      quantity: input.quantity,
      orderId: input.orderId,
      expiresAt: input.expiresAt,
      actorUserId: input.actorUserId,
      actorRoles: ['PLATFORM_ADMIN'],
      idempotencyKey: input.idempotencyKey,
      ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
    });
  }

  public async release(input: ReleaseInventoryInput): Promise<void> {
    await this.reservations.release({
      reservationId: input.reservationId,
      actorUserId: input.actorUserId,
      actorRoles: ['PLATFORM_ADMIN'],
      idempotencyKey: input.idempotencyKey,
      ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
    });
  }

  public async commit(input: CommitInventoryInput): Promise<void> {
    const reservation = await this.inventory.findReservationById(input.reservationId);
    if (!reservation) {
      throw new ReservationNotFoundError();
    }
    await this.reservations.commit({
      reservationId: input.reservationId,
      actorUserId: input.actorUserId,
      actorRoles: ['PLATFORM_ADMIN'],
      idempotencyKey: input.idempotencyKey,
      ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
    });
  }

  public restoreFromReturn(input: RestoreFromReturnInput): Promise<RestoreFromReturnResult> {
    return this.stock.restoreFromReturn(input);
  }
}
