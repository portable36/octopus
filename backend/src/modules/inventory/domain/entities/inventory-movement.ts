import type { InventoryOperationType, InventoryReferenceType } from '../inventory.types';

export interface InventoryMovementRecord {
  readonly id: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly warehouseId: string;
  readonly variantId: string;
  readonly inventoryItemId: string;
  readonly operationType: InventoryOperationType;
  readonly quantity: number;
  readonly beforeQuantity: number;
  readonly afterQuantity: number;
  readonly referenceType: InventoryReferenceType;
  readonly referenceId: string;
  readonly actorUserId: string | null;
  readonly reason: string | null;
  readonly correlationId: string | null;
  readonly createdAt: Date;
}

export function createMovement(
  input: Omit<InventoryMovementRecord, 'createdAt'> & {
    readonly createdAt?: Date;
  },
): InventoryMovementRecord {
  return {
    ...input,
    createdAt: input.createdAt ?? new Date(),
  };
}
