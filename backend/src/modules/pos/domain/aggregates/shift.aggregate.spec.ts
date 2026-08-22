import { describe, expect, it } from 'vitest';
import { Money } from '../../../../shared-kernel/domain/money.value-object';
import { Shift } from './shift.aggregate';

const usd = (dollars: number): Money => Money.create(dollars * 100, 'USD');

describe('Shift cash accountability', () => {
  it('carries the retained drawer cash into the next opening balance', () => {
    const shift = Shift.open('register-1', 'cashier-1', usd(0));

    shift.recordSale(usd(1000), 'CASH');
    shift.recordCashMovement('CASH_OUT', usd(800));
    shift.close(usd(200));

    expect(shift.expectedCash).toEqual(usd(200));
    expect(shift.totalSales).toEqual(usd(1000));
    expect(shift.nonCashSales).toEqual(usd(0));
    expect(shift.actualCash).toEqual(usd(200));
    expect(shift.difference).toEqual(usd(0));
    expect(shift.carryForwardCash).toEqual(usd(200));

    const nextShift = Shift.open('register-1', 'cashier-2', shift.carryForwardCash!);
    expect(nextShift.openingCash).toEqual(usd(200));
  });

  it('applies an audited loss adjustment before the next shift opens', () => {
    const nextShift = Shift.open('register-1', 'cashier-2', usd(200), {
      amount: usd(20),
      reason: 'Cash lost before opening',
      actorId: 'admin-1',
    });

    expect(nextShift.openingCashBeforeAdjustment).toEqual(usd(200));
    expect(nextShift.openingCash).toEqual(usd(180));
    expect(nextShift.openingBalanceAdjustment?.actorId).toBe('admin-1');
  });

  it('calculates a shortage without allowing negative money values', () => {
    const shift = Shift.open('register-1', 'cashier-1', usd(100));
    shift.recordSale(usd(50), 'CASH');
    shift.close(usd(120));

    expect(shift.expectedCash).toEqual(usd(150));
    expect(shift.difference).toEqual(usd(30));
    expect(shift.isShort).toBe(true);
  });

  it('keeps non-cash sales out of the drawer calculation', () => {
    const shift = Shift.open('register-1', 'cashier-1', usd(0));
    shift.recordSale(usd(300), 'CARD');
    shift.close(usd(0));

    expect(shift.totalSales).toEqual(usd(300));
    expect(shift.nonCashSales).toEqual(usd(300));
    expect(shift.expectedCash).toEqual(usd(0));
  });

  it('rejects movements after close and unapproved opening adjustments', () => {
    expect(() => Shift.open('register-1', 'cashier-1', usd(20), {
      amount: usd(20),
      reason: '',
      actorId: 'admin-1',
    })).toThrow('Opening balance adjustments require a reason and actor.');

    const shift = Shift.open('register-1', 'cashier-1', usd(0));
    shift.close(usd(0));

    expect(() => shift.recordCashMovement('CASH_IN', usd(1)))
      .toThrow('Only open shifts can record cash movements or close.');
  });
});