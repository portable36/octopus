export class InventoryApplicationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'InventoryApplicationError';
  }
}

export class InventoryAccessDeniedError extends InventoryApplicationError {
  constructor() {
    super('Not authorized for this inventory action.', 'INVENTORY_ACCESS_DENIED');
    this.name = 'InventoryAccessDeniedError';
  }
}

export class WarehouseNotFoundError extends InventoryApplicationError {
  constructor() {
    super('Warehouse not found.', 'WAREHOUSE_NOT_FOUND');
    this.name = 'WarehouseNotFoundError';
  }
}

export class InventoryItemNotFoundError extends InventoryApplicationError {
  constructor() {
    super('Inventory item not found.', 'INVENTORY_ITEM_NOT_FOUND');
    this.name = 'InventoryItemNotFoundError';
  }
}

export class ReservationNotFoundError extends InventoryApplicationError {
  constructor() {
    super('Reservation not found.', 'RESERVATION_NOT_FOUND');
    this.name = 'ReservationNotFoundError';
  }
}

export class VariantNotFoundForInventoryError extends InventoryApplicationError {
  constructor() {
    super('Variant not found.', 'VARIANT_NOT_FOUND');
    this.name = 'VariantNotFoundForInventoryError';
  }
}

export class WarehouseCodeTakenError extends InventoryApplicationError {
  constructor() {
    super('Warehouse code already exists for this store.', 'WAREHOUSE_CODE_TAKEN');
    this.name = 'WarehouseCodeTakenError';
  }
}

export class CrossStoreTransferDeniedError extends InventoryApplicationError {
  constructor() {
    super('Transfers must stay within the same store.', 'CROSS_STORE_TRANSFER_DENIED');
    this.name = 'CrossStoreTransferDeniedError';
  }
}
