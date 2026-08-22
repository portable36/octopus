import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { Money } from '../../../../shared-kernel/domain/money.value-object';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';

export type ShiftStatus = 'OPEN' | 'CLOSED';
export type CashMovementKind = 'CASH_SALE' | 'CASH_IN' | 'CASH_REFUND' | 'CASH_OUT';
export type SalePaymentType = 'CASH' | 'CARD' | 'MFS' | 'OTHER';

export interface OpeningBalanceAdjustment {
  amount: Money;
  reason: string;
  actorId: string;
}

interface ShiftProps {
  registerId: string;
  cashierId: string;
  openingCash: Money;
  openingCashBeforeAdjustment: Money;
  openingBalanceAdjustment?: OpeningBalanceAdjustment;
  totalSales: Money;
  nonCashSales: Money;
  cashSales: Money;
  cashIn: Money;
  cashRefunds: Money;
  cashOut: Money;
  actualCash?: Money;
  status: ShiftStatus;
}

export class Shift extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: ShiftProps,
  ) {
    super(id);
  }

  public static open(
    registerId: string,
    cashierId: string,
    openingCash: Money,
    adjustment?: OpeningBalanceAdjustment,
  ): Shift {
    if (!registerId.trim() || !cashierId.trim()) {
      throw new Error('Register and cashier are required to open a shift.');
    }
    if (adjustment) {
      Shift.assertMoneyCurrency(openingCash, adjustment.amount);
      if (!adjustment.reason.trim() || !adjustment.actorId.trim()) {
        throw new Error('Opening balance adjustments require a reason and actor.');
      }
      if (adjustment.amount.amountMinorUnits > openingCash.amountMinorUnits) {
        throw new Error('Opening balance adjustment cannot exceed the carried cash.');
      }
    }

    const effectiveOpeningCash = adjustment
      ? openingCash.subtract(adjustment.amount)
      : openingCash;
    const shift = new Shift(UniqueID.create(), {
      registerId: registerId.trim(),
      cashierId: cashierId.trim(),
      openingCash: effectiveOpeningCash,
      openingCashBeforeAdjustment: openingCash,
      ...(adjustment ? { openingBalanceAdjustment: adjustment } : {}),
      totalSales: Shift.zero(openingCash),
      nonCashSales: Shift.zero(openingCash),
      cashSales: Shift.zero(openingCash),
      cashIn: Shift.zero(openingCash),
      cashRefunds: Shift.zero(openingCash),
      cashOut: Shift.zero(openingCash),
      status: 'OPEN',
    });
    shift.addEvent('ShiftOpened', {
      shiftId: shift.id.value,
      registerId: shift.registerId,
      openingCash: shift.openingCash.amountMinorUnits,
      openingBalanceAdjustment: adjustment?.amount.amountMinorUnits ?? 0,
    });
    return shift;
  }

  get registerId(): string {
    return this.props.registerId;
  }

  get cashierId(): string {
    return this.props.cashierId;
  }

  get status(): ShiftStatus {
    return this.props.status;
  }

  get openingCash(): Money {
    return this.props.openingCash;
  }

  get openingCashBeforeAdjustment(): Money {
    return this.props.openingCashBeforeAdjustment;
  }

  get openingBalanceAdjustment(): OpeningBalanceAdjustment | undefined {
    return this.props.openingBalanceAdjustment;
  }

  get cashSales(): Money {
    return this.props.cashSales;
  }

  get totalSales(): Money {
    return this.props.totalSales;
  }

  get nonCashSales(): Money {
    return this.props.nonCashSales;
  }

  get cashIn(): Money {
    return this.props.cashIn;
  }

  get cashRefunds(): Money {
    return this.props.cashRefunds;
  }

  get cashOut(): Money {
    return this.props.cashOut;
  }

  get expectedCash(): Money {
    return this.props.openingCash
      .add(this.props.cashSales)
      .add(this.props.cashIn)
      .subtract(this.props.cashRefunds)
      .subtract(this.props.cashOut);
  }

  get actualCash(): Money | undefined {
    return this.props.actualCash;
  }

  get difference(): Money | undefined {
    if (!this.props.actualCash) {
      return undefined;
    }
    if (this.props.actualCash.amountMinorUnits >= this.expectedCash.amountMinorUnits) {
      return this.props.actualCash.subtract(this.expectedCash);
    }
    return this.expectedCash.subtract(this.props.actualCash);
  }

  get isShort(): boolean {
    return this.props.actualCash !== undefined
      && this.props.actualCash.amountMinorUnits < this.expectedCash.amountMinorUnits;
  }

  get carryForwardCash(): Money | undefined {
    return this.props.actualCash;
  }

  public recordSale(amount: Money, paymentType: SalePaymentType): void {
    this.assertOpen();
    Shift.assertMoneyCurrency(this.props.openingCash, amount);
    if (amount.amountMinorUnits === 0) {
      throw new Error('Sale amount must be greater than zero.');
    }

    if (paymentType === 'CASH') {
      this.recordCashMovement('CASH_SALE', amount);
      return;
    }
    this.props = {
      ...this.props,
      totalSales: this.props.totalSales.add(amount),
      nonCashSales: this.props.nonCashSales.add(amount),
    };
    this.addEvent('SaleRecorded', {
      shiftId: this.id.value,
      paymentType,
      amount: amount.amountMinorUnits,
    });
  }

  public recordCashMovement(kind: CashMovementKind, amount: Money): void {
    this.assertOpen();
    Shift.assertMoneyCurrency(this.props.openingCash, amount);
    if (amount.amountMinorUnits === 0) {
      throw new Error('Cash movement amount must be greater than zero.');
    }

    const totals: Record<CashMovementKind, Money> = {
      CASH_SALE: this.props.cashSales,
      CASH_IN: this.props.cashIn,
      CASH_REFUND: this.props.cashRefunds,
      CASH_OUT: this.props.cashOut,
    };
    const nextTotal = totals[kind].add(amount);
    this.props = {
      ...this.props,
      totalSales: kind === 'CASH_SALE' ? this.props.totalSales.add(amount) : this.props.totalSales,
      cashSales: kind === 'CASH_SALE' ? nextTotal : this.props.cashSales,
      cashIn: kind === 'CASH_IN' ? nextTotal : this.props.cashIn,
      cashRefunds: kind === 'CASH_REFUND' ? nextTotal : this.props.cashRefunds,
      cashOut: kind === 'CASH_OUT' ? nextTotal : this.props.cashOut,
    };
    this.addEvent('CashMovementRecorded', {
      shiftId: this.id.value,
      kind,
      amount: amount.amountMinorUnits,
    });
  }

  public close(actualCash: Money): void {
    this.assertOpen();
    Shift.assertMoneyCurrency(this.props.openingCash, actualCash);
    this.props = { ...this.props, actualCash, status: 'CLOSED' };
    this.addEvent('ShiftClosed', {
      shiftId: this.id.value,
      expectedCash: this.expectedCash.amountMinorUnits,
      actualCash: actualCash.amountMinorUnits,
      difference: this.difference?.amountMinorUnits ?? 0,
      short: this.isShort,
      carryForwardCash: actualCash.amountMinorUnits,
    });
  }

  private assertOpen(): void {
    if (this.props.status !== 'OPEN') {
      throw new Error('Only open shifts can record cash movements or close.');
    }
  }

  private static zero(reference: Money): Money {
    return Money.create(0, reference.currency);
  }

  private static assertMoneyCurrency(first: Money, second: Money): void {
    if (first.currency !== second.currency) {
      throw new Error(`Currency mismatch: ${first.currency} vs ${second.currency}.`);
    }
  }
}