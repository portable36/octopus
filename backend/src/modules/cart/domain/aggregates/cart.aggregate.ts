import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { CART_MAX_LINE_QUANTITY, type CartLineSnapshot, type CartStatus } from '../cart.types';
import {
  CartCurrencyMismatchError,
  CartDomainError,
  CartLineNotFoundError,
  CartNotActiveError,
  CartVendorIsolationError,
  InvalidCartQuantityError,
} from '../errors/cart.errors';

export interface CartLineProps {
  readonly lineId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly offerId: string;
  readonly quantity: number;
  readonly unitPriceSnapshotMinor: number;
  readonly currencyCode: string;
}

interface CartProps {
  readonly customerId: string | null;
  readonly guestToken: string | null;
  readonly currencyCode: string | null;
  readonly status: CartStatus;
  readonly version: number;
  readonly lines: readonly CartLineProps[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > CART_MAX_LINE_QUANTITY) {
    throw new InvalidCartQuantityError(
      `Quantity must be an integer from 1 to ${CART_MAX_LINE_QUANTITY}.`,
    );
  }
}

export class Cart extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: CartProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly customerId?: string | null;
    readonly guestToken?: string | null;
  }): Cart {
    const customerId = input.customerId ?? null;
    const guestToken = input.guestToken ?? null;
    if (!customerId && !guestToken) {
      throw new CartDomainOwnershipError();
    }
    const now = new Date();
    const cart = new Cart(UniqueID.create(), {
      customerId,
      guestToken,
      currencyCode: null,
      status: 'ACTIVE',
      version: 1,
      lines: [],
      createdAt: now,
      updatedAt: now,
    });
    cart.addEvent('CartCreated', {
      cartId: cart.id.value,
      customerId,
      guestToken: guestToken ? '[redacted]' : null,
    });
    return cart;
  }

  public static reconstitute(id: UniqueID, props: CartProps): Cart {
    return new Cart(id, props);
  }

  get customerId(): string | null {
    return this.props.customerId;
  }
  get guestToken(): string | null {
    return this.props.guestToken;
  }
  get currencyCode(): string | null {
    return this.props.currencyCode;
  }
  get status(): CartStatus {
    return this.props.status;
  }
  get version(): number {
    return this.props.version;
  }
  get lines(): readonly CartLineProps[] {
    return this.props.lines;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public lineSnapshots(): CartLineSnapshot[] {
    return this.props.lines.map((line) => ({
      lineId: line.lineId,
      vendorId: line.vendorId,
      storeId: line.storeId,
      productId: line.productId,
      variantId: line.variantId,
      offerId: line.offerId,
      quantity: line.quantity,
      unitPriceSnapshotMinor: line.unitPriceSnapshotMinor,
      currencyCode: line.currencyCode,
    }));
  }

  public assertActive(): void {
    if (this.props.status !== 'ACTIVE') {
      throw new CartNotActiveError();
    }
  }

  public addItem(input: {
    readonly vendorId: string;
    readonly storeId: string;
    readonly productId: string;
    readonly variantId: string;
    readonly offerId: string;
    readonly quantity: number;
    readonly unitPriceSnapshotMinor: number;
    readonly currencyCode: string;
  }): void {
    this.assertActive();
    assertQuantity(input.quantity);
    if (!Number.isInteger(input.unitPriceSnapshotMinor) || input.unitPriceSnapshotMinor < 0) {
      throw new InvalidCartQuantityError('Price snapshot must be a non-negative integer.');
    }
    const currency = input.currencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new CartCurrencyMismatchError();
    }
    if (this.props.currencyCode && this.props.currencyCode !== currency) {
      throw new CartCurrencyMismatchError();
    }

    const existingIndex = this.props.lines.findIndex(
      (line) => line.storeId === input.storeId && line.variantId === input.variantId,
    );
    let nextLines: CartLineProps[];
    if (existingIndex >= 0) {
      const existing = this.props.lines[existingIndex]!;
      if (existing.vendorId !== input.vendorId || existing.offerId !== input.offerId) {
        throw new CartVendorIsolationError();
      }
      const quantity = existing.quantity + input.quantity;
      assertQuantity(quantity);
      nextLines = this.props.lines.map((line, index) =>
        index === existingIndex
          ? {
              ...line,
              quantity,
              unitPriceSnapshotMinor: input.unitPriceSnapshotMinor,
            }
          : line,
      );
    } else {
      nextLines = [
        ...this.props.lines,
        {
          lineId: UniqueID.create().value,
          vendorId: input.vendorId,
          storeId: input.storeId,
          productId: input.productId,
          variantId: input.variantId,
          offerId: input.offerId,
          quantity: input.quantity,
          unitPriceSnapshotMinor: input.unitPriceSnapshotMinor,
          currencyCode: currency,
        },
      ];
    }

    this.props = {
      ...this.props,
      currencyCode: currency,
      lines: Object.freeze(nextLines),
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
    this.addEvent('CartItemAdded', {
      cartId: this.id.value,
      storeId: input.storeId,
      variantId: input.variantId,
      quantity: input.quantity,
    });
  }

  public updateQuantity(lineId: string, quantity: number): void {
    this.assertActive();
    assertQuantity(quantity);
    const index = this.props.lines.findIndex((line) => line.lineId === lineId);
    if (index < 0) {
      throw new CartLineNotFoundError();
    }
    const nextLines = this.props.lines.map((line, i) =>
      i === index ? { ...line, quantity } : line,
    );
    this.props = {
      ...this.props,
      lines: Object.freeze(nextLines),
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
    this.addEvent('CartItemQuantityUpdated', { cartId: this.id.value, lineId, quantity });
  }

  public removeItem(lineId: string): void {
    this.assertActive();
    if (!this.props.lines.some((line) => line.lineId === lineId)) {
      // Idempotent remove
      return;
    }
    const nextLines = this.props.lines.filter((line) => line.lineId !== lineId);
    this.props = {
      ...this.props,
      lines: Object.freeze(nextLines),
      currencyCode: nextLines.length === 0 ? null : this.props.currencyCode,
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
    this.addEvent('CartItemRemoved', { cartId: this.id.value, lineId });
  }

  public clear(): void {
    this.assertActive();
    if (this.props.lines.length === 0) {
      return;
    }
    this.props = {
      ...this.props,
      lines: Object.freeze([]),
      currencyCode: null,
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
    this.addEvent('CartCleared', { cartId: this.id.value });
  }

  public refreshLinePriceSnapshot(lineId: string, unitPriceSnapshotMinor: number): void {
    this.assertActive();
    if (!Number.isInteger(unitPriceSnapshotMinor) || unitPriceSnapshotMinor < 0) {
      throw new InvalidCartQuantityError('Price snapshot must be a non-negative integer.');
    }
    const index = this.props.lines.findIndex((line) => line.lineId === lineId);
    if (index < 0) {
      throw new CartLineNotFoundError();
    }
    const nextLines = this.props.lines.map((line, i) =>
      i === index ? { ...line, unitPriceSnapshotMinor } : line,
    );
    this.props = {
      ...this.props,
      lines: Object.freeze(nextLines),
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
  }

  public attachCustomer(customerId: string): void {
    if (this.props.customerId && this.props.customerId !== customerId) {
      throw new CartDomainOwnershipError();
    }
    this.props = {
      ...this.props,
      customerId,
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
  }

  public abandon(): void {
    this.assertActive();
    this.props = {
      ...this.props,
      status: 'ABANDONED',
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
    this.addEvent('CartAbandoned', { cartId: this.id.value });
  }

  public assertExpectedVersion(expectedVersion: number): void {
    if (this.props.version !== expectedVersion) {
      throw new CartDomainError(
        `Cart version mismatch: expected ${expectedVersion}, got ${this.props.version}.`,
        'CART_VERSION_CONFLICT',
      );
    }
  }

  public markCheckedOut(expectedVersion: number): void {
    this.assertActive();
    this.assertExpectedVersion(expectedVersion);
    this.props = {
      ...this.props,
      status: 'CHECKED_OUT',
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
    this.addEvent('CartCheckedOut', { cartId: this.id.value, version: this.props.version });
  }
}

class CartDomainOwnershipError extends CartDomainError {
  constructor() {
    super('Cart requires a customer or guest token owner.', 'CART_OWNERSHIP');
  }
}
