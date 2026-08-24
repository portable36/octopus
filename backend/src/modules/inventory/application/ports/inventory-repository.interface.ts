import type { InventoryItem } from '../../domain/aggregates/inventory-item.aggregate';
import type { InventoryReservation } from '../../domain/aggregates/inventory-reservation.aggregate';
import type { InventoryMovementRecord } from '../../domain/entities/inventory-movement';

export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');

export interface InventoryMutationUnitOfWork {
  saveItem(item: InventoryItem): Promise<void>;
  saveReservation(reservation: InventoryReservation): Promise<void>;
  appendMovement(movement: InventoryMovementRecord): Promise<void>;
  findItemByWarehouseAndVariantForUpdate(
    warehouseId: string,
    variantId: string,
  ): Promise<InventoryItem | null>;
  findItemByIdForUpdate(id: string): Promise<InventoryItem | null>;
  findReservationByIdForUpdate(id: string): Promise<InventoryReservation | null>;
  findExpiredActiveReservations(now: Date, limit: number): Promise<InventoryReservation[]>;
}

export interface InventoryRepository {
  saveItem(item: InventoryItem): Promise<void>;
  findItemById(id: string): Promise<InventoryItem | null>;
  findItemByWarehouseAndVariant(
    warehouseId: string,
    variantId: string,
  ): Promise<InventoryItem | null>;
  findItemsByStoreAndVariant(storeId: string, variantId: string): Promise<InventoryItem[]>;
  findReservationById(id: string): Promise<InventoryReservation | null>;
  /**
   * Runs work inside one DB transaction with RLS + row locks available via the UoW.
   */
  withLockedUnitOfWork<T>(work: (uow: InventoryMutationUnitOfWork) => Promise<T>): Promise<T>;
  findCompletedOperation(idempotencyKey: string): Promise<Record<string, unknown> | null>;
  recordCompletedOperation(input: {
    readonly idempotencyKey: string;
    readonly operationType: string;
    readonly referenceId?: string | null;
    readonly result: Record<string, unknown>;
  }): Promise<void>;
}
