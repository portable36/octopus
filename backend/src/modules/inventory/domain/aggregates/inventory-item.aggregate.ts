import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  InsufficientStockError,
  InventoryDomainError,
  InventoryItemDisabledError,
  InvalidStockQuantityError,
} from '../errors/inventory.errors';
import type { InventoryItemStatus } from '../inventory.types';
import { StockQuantity } from '../value-objects/stock-quantity.vo';

interface InventoryItemProps {
  readonly vendorId: string;
  readonly storeId: string;
  readonly warehouseId: string;
  readonly variantId: string;
  readonly onHand: StockQuantity;
  readonly reserved: StockQuantity;
  readonly lowStockThreshold: StockQuantity;
  readonly status: InventoryItemStatus;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class InventoryItem extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: InventoryItemProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly vendorId: string;
    readonly storeId: string;
    readonly warehouseId: string;
    readonly variantId: string;
    readonly lowStockThreshold?: number;
  }): InventoryItem {
    const now = new Date();
    const item = new InventoryItem(UniqueID.create(), {
      vendorId: input.vendorId,
      storeId: input.storeId,
      warehouseId: input.warehouseId,
      variantId: input.variantId,
      onHand: StockQuantity.zero(),
      reserved: StockQuantity.zero(),
      lowStockThreshold: StockQuantity.of(input.lowStockThreshold ?? 0),
      status: 'ACTIVE',
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    item.addEvent('InventoryItemCreated', {
      inventoryItemId: item.id.value,
      variantId: item.variantId,
      warehouseId: item.warehouseId,
    });
    return item;
  }

  public static reconstitute(id: UniqueID, props: InventoryItemProps): InventoryItem {
    return new InventoryItem(id, props);
  }

  get vendorId(): string {
    return this.props.vendorId;
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get warehouseId(): string {
    return this.props.warehouseId;
  }

  get variantId(): string {
    return this.props.variantId;
  }

  get onHand(): number {
    return this.props.onHand.value;
  }

  get reserved(): number {
    return this.props.reserved.value;
  }

  get available(): number {
    return this.props.onHand.value - this.props.reserved.value;
  }

  get lowStockThreshold(): number {
    return this.props.lowStockThreshold.value;
  }

  get status(): InventoryItemStatus {
    return this.props.status;
  }

  get version(): number {
    return this.props.version;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public assertActive(): void {
    if (this.props.status !== 'ACTIVE') {
      throw new InventoryItemDisabledError();
    }
  }

  public setLowStockThreshold(value: number): void {
    this.props = {
      ...this.props,
      lowStockThreshold: StockQuantity.of(value),
      updatedAt: new Date(),
      version: this.props.version + 1,
    };
  }

  public disable(): void {
    this.props = {
      ...this.props,
      status: 'DISABLED',
      updatedAt: new Date(),
      version: this.props.version + 1,
    };
  }

  public enable(): void {
    this.props = {
      ...this.props,
      status: 'ACTIVE',
      updatedAt: new Date(),
      version: this.props.version + 1,
    };
  }

  /** Returns before/after onHand for ledger. */
  public receive(quantity: number): { before: number; after: number } {
    this.assertActive();
    const qty = StockQuantity.positive(quantity);
    const before = this.props.onHand.value;
    this.props = {
      ...this.props,
      onHand: this.props.onHand.add(qty),
      updatedAt: new Date(),
      version: this.props.version + 1,
    };
    this.emitAdjusted('RECEIVE', qty.value);
    return { before, after: this.props.onHand.value };
  }

  public adjust(delta: number, reason: string): { before: number; after: number } {
    this.assertActive();
    if (!reason.trim()) {
      throw new InventoryDomainError('Adjustment reason is required.');
    }
    if (!Number.isInteger(delta) || delta === 0) {
      throw new InvalidStockQuantityError('Adjustment delta must be a non-zero integer.');
    }
    const before = this.props.onHand.value;
    const nextOnHand = before + delta;
    if (nextOnHand < 0) {
      throw new InvalidStockQuantityError('On-hand quantity cannot be negative.');
    }
    if (this.props.reserved.value > nextOnHand) {
      throw new InvalidStockQuantityError('Reserved quantity cannot exceed on-hand.');
    }
    this.props = {
      ...this.props,
      onHand: StockQuantity.of(nextOnHand),
      updatedAt: new Date(),
      version: this.props.version + 1,
    };
    this.emitAdjusted(delta > 0 ? 'INCREASE' : 'DECREASE', Math.abs(delta));
    if (this.available === 0) {
      this.addEvent('InventoryDepleted', {
        inventoryItemId: this.id.value,
        variantId: this.variantId,
        warehouseId: this.warehouseId,
      });
    }
    return { before, after: this.props.onHand.value };
  }

  public transferOut(quantity: number): { before: number; after: number } {
    this.assertActive();
    const qty = StockQuantity.positive(quantity);
    if (this.available < qty.value) {
      throw new InsufficientStockError();
    }
    const before = this.props.onHand.value;
    this.props = {
      ...this.props,
      onHand: this.props.onHand.subtract(qty),
      updatedAt: new Date(),
      version: this.props.version + 1,
    };
    this.addEvent('StockTransferred', {
      inventoryItemId: this.id.value,
      variantId: this.variantId,
      warehouseId: this.warehouseId,
      quantity: qty.value,
      direction: 'OUT',
    });
    return { before, after: this.props.onHand.value };
  }

  public transferIn(quantity: number): { before: number; after: number } {
    this.assertActive();
    const qty = StockQuantity.positive(quantity);
    const before = this.props.onHand.value;
    this.props = {
      ...this.props,
      onHand: this.props.onHand.add(qty),
      updatedAt: new Date(),
      version: this.props.version + 1,
    };
    this.addEvent('StockTransferred', {
      inventoryItemId: this.id.value,
      variantId: this.variantId,
      warehouseId: this.warehouseId,
      quantity: qty.value,
      direction: 'IN',
    });
    return { before, after: this.props.onHand.value };
  }

  public reserve(quantity: number): { beforeReserved: number; afterReserved: number } {
    this.assertActive();
    const qty = StockQuantity.positive(quantity);
    if (this.available < qty.value) {
      throw new InsufficientStockError();
    }
    const beforeReserved = this.props.reserved.value;
    this.props = {
      ...this.props,
      reserved: this.props.reserved.add(qty),
      updatedAt: new Date(),
      version: this.props.version + 1,
    };
    this.addEvent('InventoryReserved', {
      inventoryItemId: this.id.value,
      variantId: this.variantId,
      warehouseId: this.warehouseId,
      quantity: qty.value,
      available: this.available,
    });
    return { beforeReserved, afterReserved: this.props.reserved.value };
  }

  public release(quantity: number): { beforeReserved: number; afterReserved: number } {
    const qty = StockQuantity.positive(quantity);
    if (qty.value > this.props.reserved.value) {
      throw new InvalidStockQuantityError('Cannot release more than reserved.');
    }
    const beforeReserved = this.props.reserved.value;
    this.props = {
      ...this.props,
      reserved: this.props.reserved.subtract(qty),
      updatedAt: new Date(),
      version: this.props.version + 1,
    };
    this.addEvent('InventoryReleased', {
      inventoryItemId: this.id.value,
      variantId: this.variantId,
      warehouseId: this.warehouseId,
      quantity: qty.value,
      available: this.available,
    });
    return { beforeReserved, afterReserved: this.props.reserved.value };
  }

  /** Convert active reservation into on-hand deduction. */
  public deduct(quantity: number): {
    beforeOnHand: number;
    afterOnHand: number;
    beforeReserved: number;
    afterReserved: number;
  } {
    this.assertActive();
    const qty = StockQuantity.positive(quantity);
    if (qty.value > this.props.reserved.value || qty.value > this.props.onHand.value) {
      throw new InsufficientStockError();
    }
    const beforeOnHand = this.props.onHand.value;
    const beforeReserved = this.props.reserved.value;
    this.props = {
      ...this.props,
      onHand: this.props.onHand.subtract(qty),
      reserved: this.props.reserved.subtract(qty),
      updatedAt: new Date(),
      version: this.props.version + 1,
    };
    this.addEvent('StockDeducted', {
      inventoryItemId: this.id.value,
      variantId: this.variantId,
      warehouseId: this.warehouseId,
      quantity: qty.value,
      available: this.available,
    });
    if (this.available === 0) {
      this.addEvent('InventoryDepleted', {
        inventoryItemId: this.id.value,
        variantId: this.variantId,
        warehouseId: this.warehouseId,
      });
    }
    return {
      beforeOnHand,
      afterOnHand: this.props.onHand.value,
      beforeReserved,
      afterReserved: this.props.reserved.value,
    };
  }

  public restock(quantity: number): { before: number; after: number } {
    return this.receive(quantity);
  }

  public toProps(): InventoryItemProps {
    return { ...this.props };
  }

  private emitAdjusted(kind: string, quantity: number): void {
    this.addEvent('InventoryAdjusted', {
      inventoryItemId: this.id.value,
      variantId: this.variantId,
      warehouseId: this.warehouseId,
      kind,
      quantity,
      onHand: this.onHand,
      reserved: this.reserved,
      available: this.available,
    });
  }
}
