export const INVENTORY_PORT = Symbol('INVENTORY_PORT');

export interface AvailabilityQuery {
  readonly variantId: string;
  readonly warehouseId: string;
}

export interface AvailabilityResult {
  readonly variantId: string;
  readonly warehouseId: string;
  readonly onHand: number;
  readonly reserved: number;
  readonly available: number;
  readonly status: 'ACTIVE' | 'DISABLED' | 'MISSING';
}

export interface StoreAvailabilityQuery {
  readonly storeId: string;
  readonly variantId: string;
}

export interface StoreAvailabilityResult {
  readonly storeId: string;
  readonly variantId: string;
  readonly available: number;
  readonly status: 'ACTIVE' | 'DISABLED' | 'MISSING';
}

export interface PickWarehouseInput {
  readonly storeId: string;
  readonly variantId: string;
  readonly quantity: number;
}

export interface PickWarehouseResult {
  readonly warehouseId: string;
  readonly available: number;
}

export interface ReserveInventoryInput {
  readonly variantId: string;
  readonly warehouseId: string;
  readonly quantity: number;
  readonly orderId: string;
  readonly expiresAt: Date;
  readonly actorUserId: string;
  readonly idempotencyKey: string;
  readonly correlationId?: string;
}

export interface ReservationResult {
  readonly reservationId: string;
  readonly availableAfter: number;
}

export interface ReleaseInventoryInput {
  readonly reservationId: string;
  readonly actorUserId: string;
  readonly idempotencyKey: string;
  readonly correlationId?: string;
}

export interface CommitInventoryInput {
  readonly reservationId: string;
  readonly actorUserId: string;
  readonly idempotencyKey: string;
  readonly correlationId?: string;
}

export interface InventoryPort {
  checkAvailability(input: AvailabilityQuery): Promise<AvailabilityResult>;
  /** Sum of available qty across active warehouse items for a store + variant. */
  checkStoreAvailability(input: StoreAvailabilityQuery): Promise<StoreAvailabilityResult>;
  /** Prefer the active warehouse with enough available qty (deterministic: max available, then id). */
  pickWarehouseForReservation(input: PickWarehouseInput): Promise<PickWarehouseResult | null>;
  reserve(input: ReserveInventoryInput): Promise<ReservationResult>;
  release(input: ReleaseInventoryInput): Promise<void>;
  commit(input: CommitInventoryInput): Promise<void>;
}
