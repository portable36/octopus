import { ValueObject } from './value-object';

interface MoneyProps {
  amountMinorUnits: number;
  currency: string;
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  public static create(amountMinorUnits: number, currency: string): Money {
    if (!Number.isInteger(amountMinorUnits)) {
      throw new Error('Money amount must be an integer number of minor units.');
    }
    if (amountMinorUnits < 0) {
      throw new Error('Money amount cannot be negative.');
    }
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      throw new Error('Currency must be a 3-letter ISO 4217 code.');
    }
    return new Money({ amountMinorUnits, currency: normalizedCurrency });
  }

  get amountMinorUnits(): number {
    return this.props.amountMinorUnits;
  }

  get currency(): string {
    return this.props.currency;
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({
      amountMinorUnits: this.props.amountMinorUnits + other.props.amountMinorUnits,
      currency: this.props.currency,
    });
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const result = this.props.amountMinorUnits - other.props.amountMinorUnits;
    if (result < 0) {
      throw new Error('Subtraction would result in negative money.');
    }
    return new Money({ amountMinorUnits: result, currency: this.props.currency });
  }

  public multiply(factor: number): Money {
    const result = Math.round(this.props.amountMinorUnits * factor);
    if (result < 0) {
      throw new Error('Multiplication would result in negative money.');
    }
    return new Money({ amountMinorUnits: result, currency: this.props.currency });
  }

  private assertSameCurrency(other: Money): void {
    if (this.props.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.props.currency} vs ${other.currency}.`);
    }
  }

  override toString(): string {
    return `${this.props.amountMinorUnits} ${this.props.currency}`;
  }
}
