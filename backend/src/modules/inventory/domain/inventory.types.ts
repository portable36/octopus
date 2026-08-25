export type WarehouseStatus = 'ACTIVE' | 'DISABLED';
export type InventoryItemStatus = 'ACTIVE' | 'DISABLED';

export type ReservationStatus =
  'PENDING' | 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'CONSUMED' | 'CANCELLED';

export type InventoryOperationType =
  | 'RECEIVE'
  | 'INCREASE'
  | 'DECREASE'
  | 'ADJUST'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'RESERVE'
  | 'RELEASE'
  | 'EXPIRE'
  | 'DEDUCT'
  | 'RESTOCK'
  | 'RETURN_UNSELLABLE';

export type InventoryReferenceType =
  'MANUAL' | 'ORDER' | 'TRANSFER' | 'RESERVATION' | 'RETURN' | 'SYSTEM';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function stockStatus(available: number, lowStockThreshold: number): StockStatus {
  if (available <= 0) {
    return 'OUT_OF_STOCK';
  }
  if (available <= lowStockThreshold) {
    return 'LOW_STOCK';
  }
  return 'IN_STOCK';
}
