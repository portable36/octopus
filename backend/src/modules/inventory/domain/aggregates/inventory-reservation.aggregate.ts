import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  InvalidReservationStateError,
  InvalidStockQuantityError,
} from '../errors/inventory.errors';
import type { ReservationStatus } from '../inventory.types';
import { StockQuantity } from '../value-objects/stock-quantity.vo';

interface ReservationProps {
  readonly vendorId: string;
  readonly storeId: string;
  readonly warehouseId: string;
  readonly variantId: string;
  readonly inventoryItemId: string;
  readonly orderId: string;
  readonly quantity: StockQuantity;
  readonly status: ReservationStatus;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class InventoryReservation extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: ReservationProps,
  ) {
    super(id);
  }

  public static createActive(input: {
    readonly vendorId: string;
    readonly storeId: string;
    readonly warehouseId: string;
    readonly variantId: string;
    readonly inventoryItemId: string;
    readonly orderId: string;
    readonly quantity: number;
    readonly expiresAt: Date;
  }): InventoryReservation {
    const qty = StockQuantity.positive(input.quantity);
    if (!(input.expiresAt instanceof Date) || Number.isNaN(input.expiresAt.getTime())) {
      throw new InvalidStockQuantityError('Reservation expiresAt must be a valid date.');
    }
    const now = new Date();
    return new InventoryReservation(UniqueID.create(), {
      vendorId: input.vendorId,
      storeId: input.storeId,
      warehouseId: input.warehouseId,
      variantId: input.variantId,
      inventoryItemId: input.inventoryItemId,
      orderId: input.orderId.trim(),
      quantity: qty,
      status: 'ACTIVE',
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstitute(id: UniqueID, props: ReservationProps): InventoryReservation {
    return new InventoryReservation(id, props);
  }

  public release(): void {
    this.assertActive();
    this.props = { ...this.props, status: 'RELEASED', updatedAt: new Date() };
  }

  public expire(): void {
    this.assertActive();
    this.props = { ...this.props, status: 'EXPIRED', updatedAt: new Date() };
    this.addEvent('ReservationExpired', {
      reservationId: this.id.value,
      variantId: this.variantId,
      warehouseId: this.warehouseId,
      quantity: this.quantity,
    });
  }

  public consume(): void {
    this.assertActive();
    this.props = { ...this.props, status: 'CONSUMED', updatedAt: new Date() };
  }

  public cancel(): void {
    this.assertActive();
    this.props = { ...this.props, status: 'CANCELLED', updatedAt: new Date() };
  }

  public isExpiredAt(now: Date): boolean {
    return this.props.status === 'ACTIVE' && this.props.expiresAt.getTime() <= now.getTime();
  }

  private assertActive(): void {
    if (this.props.status !== 'ACTIVE') {
      throw new InvalidReservationStateError(
        `Reservation is ${this.props.status} and cannot be changed.`,
      );
    }
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

  get inventoryItemId(): string {
    return this.props.inventoryItemId;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get quantity(): number {
    return this.props.quantity.value;
  }

  get status(): ReservationStatus {
    return this.props.status;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public toProps(): ReservationProps {
    return { ...this.props };
  }
}
