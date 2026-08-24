export class InventoryDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryDomainError';
  }
}

export class InsufficientStockError extends InventoryDomainError {
  constructor() {
    super('Insufficient available stock.');
    this.name = 'InsufficientStockError';
  }
}

export class InventoryItemDisabledError extends InventoryDomainError {
  constructor() {
    super('Inventory item is disabled.');
    this.name = 'InventoryItemDisabledError';
  }
}

export class InvalidStockQuantityError extends InventoryDomainError {
  constructor(message = 'Invalid stock quantity.') {
    super(message);
    this.name = 'InvalidStockQuantityError';
  }
}

export class InvalidReservationStateError extends InventoryDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidReservationStateError';
  }
}

export class WarehouseDisabledError extends InventoryDomainError {
  constructor() {
    super('Warehouse is disabled.');
    this.name = 'WarehouseDisabledError';
  }
}
