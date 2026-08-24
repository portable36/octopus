import { InvalidStockQuantityError } from '../errors/inventory.errors';

/** Non-negative integer stock quantity (minor units of sellable count, not money). */
export class StockQuantity {
  private constructor(public readonly value: number) {}

  public static zero(): StockQuantity {
    return new StockQuantity(0);
  }

  public static of(value: number): StockQuantity {
    if (!Number.isInteger(value) || value < 0) {
      throw new InvalidStockQuantityError('Stock quantity must be a non-negative integer.');
    }
    if (!Number.isSafeInteger(value)) {
      throw new InvalidStockQuantityError('Stock quantity exceeds safe integer range.');
    }
    return new StockQuantity(value);
  }

  public static positive(value: number): StockQuantity {
    const qty = StockQuantity.of(value);
    if (qty.value === 0) {
      throw new InvalidStockQuantityError('Quantity must be greater than zero.');
    }
    return qty;
  }

  public add(other: StockQuantity): StockQuantity {
    return StockQuantity.of(this.value + other.value);
  }

  public subtract(other: StockQuantity): StockQuantity {
    if (other.value > this.value) {
      throw new InvalidStockQuantityError('Resulting stock quantity cannot be negative.');
    }
    return StockQuantity.of(this.value - other.value);
  }

  public isGreaterThan(other: StockQuantity): boolean {
    return this.value > other.value;
  }

  public equals(other: StockQuantity): boolean {
    return this.value === other.value;
  }
}
