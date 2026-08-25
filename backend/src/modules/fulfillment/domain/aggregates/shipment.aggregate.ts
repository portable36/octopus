import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  InvalidShipmentSnapshotError,
  InvalidShipmentTransitionError,
} from '../errors/fulfillment.errors';
import type {
  CourierProvider,
  ShipmentLineSnapshot,
  ShipmentRecipientSnapshot,
  ShipmentStatus,
} from '../fulfillment.types';

interface ShipmentProps {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly provider: CourierProvider;
  readonly status: ShipmentStatus;
  readonly lines: readonly ShipmentLineSnapshot[];
  readonly recipient: ShipmentRecipientSnapshot;
  readonly amountToCollectMinor: number;
  readonly currencyCode: string;
  readonly merchantOrderRef: string;
  readonly providerConsignmentId: string | null;
  readonly trackingCode: string | null;
  readonly providerStatus: string | null;
  readonly itemSummary: string;
  readonly weightKg: number;
  readonly note: string | null;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const ALLOWED: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  PENDING: ['PROCESSING', 'SHIPPED', 'FAILED'],
  PROCESSING: ['SHIPPED', 'FAILED'],
  SHIPPED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'RETURNED'],
  DELIVERED: [],
  FAILED: [],
  RETURNED: [],
};

export class Shipment extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: ShipmentProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly orderId: string;
    readonly orderNumber: string;
    readonly vendorId: string;
    readonly storeId: string;
    readonly provider: CourierProvider;
    readonly lines: readonly ShipmentLineSnapshot[];
    readonly recipient: ShipmentRecipientSnapshot;
    readonly amountToCollectMinor: number;
    readonly currencyCode: string;
    readonly merchantOrderRef: string;
    readonly itemSummary: string;
    readonly weightKg: number;
    readonly note?: string | null;
  }): Shipment {
    if (input.lines.length === 0) {
      throw new InvalidShipmentSnapshotError('Shipment requires at least one line.');
    }
    if (!Number.isInteger(input.amountToCollectMinor) || input.amountToCollectMinor < 0) {
      throw new InvalidShipmentSnapshotError(
        'amountToCollectMinor must be a non-negative integer.',
      );
    }
    if (!(input.weightKg >= 0.5 && input.weightKg <= 10)) {
      throw new InvalidShipmentSnapshotError('weightKg must be between 0.5 and 10.');
    }
    const phone = input.recipient.phone.replace(/\D/g, '');
    if (phone.length !== 11) {
      throw new InvalidShipmentSnapshotError('Recipient phone must be 11 digits.');
    }
    const now = new Date();
    const shipment = new Shipment(UniqueID.create(), {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      vendorId: input.vendorId,
      storeId: input.storeId,
      provider: input.provider,
      status: 'PENDING',
      lines: Object.freeze(input.lines.map((l) => ({ ...l }))),
      recipient: {
        name: input.recipient.name.trim(),
        phone,
        secondaryPhone: input.recipient.secondaryPhone?.replace(/\D/g, '') || null,
        address: input.recipient.address.trim(),
      },
      amountToCollectMinor: input.amountToCollectMinor,
      currencyCode: input.currencyCode.trim().toUpperCase(),
      merchantOrderRef: input.merchantOrderRef,
      providerConsignmentId: null,
      trackingCode: null,
      providerStatus: null,
      itemSummary: input.itemSummary.trim(),
      weightKg: input.weightKg,
      note: input.note?.trim() || null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    shipment.addEvent('ShipmentCreated', {
      shipmentId: shipment.id.value,
      orderId: shipment.orderId,
      provider: shipment.provider,
    });
    return shipment;
  }

  public static reconstitute(id: UniqueID, props: ShipmentProps): Shipment {
    return new Shipment(id, props);
  }

  get orderId(): string {
    return this.props.orderId;
  }
  get orderNumber(): string {
    return this.props.orderNumber;
  }
  get vendorId(): string {
    return this.props.vendorId;
  }
  get storeId(): string {
    return this.props.storeId;
  }
  get provider(): CourierProvider {
    return this.props.provider;
  }
  get status(): ShipmentStatus {
    return this.props.status;
  }
  get lines(): readonly ShipmentLineSnapshot[] {
    return this.props.lines;
  }
  get recipient(): ShipmentRecipientSnapshot {
    return this.props.recipient;
  }
  get amountToCollectMinor(): number {
    return this.props.amountToCollectMinor;
  }
  get currencyCode(): string {
    return this.props.currencyCode;
  }
  get merchantOrderRef(): string {
    return this.props.merchantOrderRef;
  }
  get providerConsignmentId(): string | null {
    return this.props.providerConsignmentId;
  }
  get trackingCode(): string | null {
    return this.props.trackingCode;
  }
  get providerStatus(): string | null {
    return this.props.providerStatus;
  }
  get itemSummary(): string {
    return this.props.itemSummary;
  }
  get weightKg(): number {
    return this.props.weightKg;
  }
  get note(): string | null {
    return this.props.note;
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

  public markShipped(input: {
    readonly providerConsignmentId: string;
    readonly trackingCode: string | null;
    readonly providerStatus: string;
  }): void {
    this.assertCanTransition('SHIPPED');
    this.props = {
      ...this.props,
      status: 'SHIPPED',
      providerConsignmentId: input.providerConsignmentId,
      trackingCode: input.trackingCode,
      providerStatus: input.providerStatus,
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
    this.addEvent('ShipmentShipped', {
      shipmentId: this.id.value,
      providerConsignmentId: input.providerConsignmentId,
      trackingCode: input.trackingCode,
    });
  }

  public applyProviderStatus(normalized: ShipmentStatus, providerStatus: string): void {
    if (normalized === this.props.status) {
      this.props = {
        ...this.props,
        providerStatus,
        updatedAt: new Date(),
      };
      return;
    }
    this.assertCanTransition(normalized);
    this.props = {
      ...this.props,
      status: normalized,
      providerStatus,
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
    if (normalized === 'DELIVERED') {
      this.addEvent('ShipmentDelivered', {
        shipmentId: this.id.value,
        orderId: this.props.orderId,
        orderNumber: this.props.orderNumber,
      });
    } else if (normalized === 'FAILED') {
      this.addEvent('ShipmentFailed', { shipmentId: this.id.value });
    }
  }

  public markDeliveredManual(trackingCode?: string): void {
    if (this.props.provider !== 'MANUAL') {
      throw new InvalidShipmentSnapshotError(
        'Only MANUAL shipments can be marked delivered manually.',
      );
    }
    this.assertCanTransition('DELIVERED');
    this.props = {
      ...this.props,
      status: 'DELIVERED',
      trackingCode: trackingCode?.trim() || this.props.trackingCode,
      providerStatus: 'delivered',
      providerConsignmentId: this.props.providerConsignmentId ?? this.id.value,
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
    this.addEvent('ShipmentDelivered', {
      shipmentId: this.id.value,
      orderId: this.props.orderId,
      orderNumber: this.props.orderNumber,
    });
  }

  private assertCanTransition(next: ShipmentStatus): void {
    if (!ALLOWED[this.props.status].includes(next)) {
      throw new InvalidShipmentTransitionError(this.props.status, next);
    }
  }
}
