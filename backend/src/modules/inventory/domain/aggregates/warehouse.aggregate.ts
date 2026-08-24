import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { InventoryDomainError, WarehouseDisabledError } from '../errors/inventory.errors';
import type { WarehouseStatus } from '../inventory.types';

interface WarehouseProps {
  readonly vendorId: string;
  readonly storeId: string;
  readonly code: string;
  readonly name: string;
  readonly status: WarehouseStatus;
  readonly addressLine: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function normalizeCode(raw: string): string {
  const code = raw.trim().toUpperCase().replace(/\s+/g, '-');
  if (code.length < 2 || code.length > 40) {
    throw new InventoryDomainError('Warehouse code must be 2–40 characters.');
  }
  if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(code)) {
    throw new InventoryDomainError('Warehouse code has invalid characters.');
  }
  return code;
}

export class Warehouse extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: WarehouseProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly vendorId: string;
    readonly storeId: string;
    readonly code: string;
    readonly name: string;
    readonly addressLine?: string | null;
  }): Warehouse {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new InventoryDomainError('Warehouse name must be at least 2 characters.');
    }
    const now = new Date();
    const warehouse = new Warehouse(UniqueID.create(), {
      vendorId: input.vendorId,
      storeId: input.storeId,
      code: normalizeCode(input.code),
      name,
      status: 'ACTIVE',
      addressLine: input.addressLine?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });
    warehouse.addEvent('WarehouseCreated', {
      warehouseId: warehouse.id.value,
      storeId: warehouse.storeId,
      vendorId: warehouse.vendorId,
      code: warehouse.code,
    });
    return warehouse;
  }

  public static reconstitute(id: UniqueID, props: WarehouseProps): Warehouse {
    return new Warehouse(id, props);
  }

  public rename(name: string): void {
    this.assertActive();
    const next = name.trim();
    if (next.length < 2) {
      throw new InventoryDomainError('Warehouse name must be at least 2 characters.');
    }
    this.props = { ...this.props, name: next, updatedAt: new Date() };
  }

  public disable(): void {
    if (this.props.status === 'DISABLED') {
      return;
    }
    this.props = { ...this.props, status: 'DISABLED', updatedAt: new Date() };
    this.addEvent('WarehouseDisabled', { warehouseId: this.id.value });
  }

  public enable(): void {
    this.props = { ...this.props, status: 'ACTIVE', updatedAt: new Date() };
  }

  public assertActive(): void {
    if (this.props.status !== 'ACTIVE') {
      throw new WarehouseDisabledError();
    }
  }

  get vendorId(): string {
    return this.props.vendorId;
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get code(): string {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): WarehouseStatus {
    return this.props.status;
  }

  get addressLine(): string | null {
    return this.props.addressLine;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public toProps(): WarehouseProps {
    return { ...this.props };
  }
}
