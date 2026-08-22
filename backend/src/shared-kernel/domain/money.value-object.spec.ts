import { describe, expect, it } from 'vitest';
import { Money } from './money.value-object';

describe('Money', () => {
  it('creates money with integer minor units', () => {
    const money = Money.create(1050, 'BDT');
    expect(money.amountMinorUnits).toBe(1050);
    expect(money.currency).toBe('BDT');
  });

  it('normalizes currency to uppercase', () => {
    const money = Money.create(100, 'bdt');
    expect(money.currency).toBe('BDT');
  });

  it('rejects non-integer amounts', () => {
    expect(() => Money.create(10.5, 'BDT')).toThrow('integer');
  });

  it('rejects negative amounts', () => {
    expect(() => Money.create(-1, 'BDT')).toThrow('negative');
  });

  it('rejects invalid currency codes', () => {
    expect(() => Money.create(100, 'US')).toThrow('ISO 4217');
    expect(() => Money.create(100, 'DOLLAR')).toThrow('ISO 4217');
  });

  it('adds same-currency amounts', () => {
    const a = Money.create(500, 'BDT');
    const b = Money.create(250, 'BDT');
    expect(a.add(b).amountMinorUnits).toBe(750);
  });

  it('rejects cross-currency addition', () => {
    const bdt = Money.create(500, 'BDT');
    const usd = Money.create(250, 'USD');
    expect(() => bdt.add(usd)).toThrow('Currency mismatch');
  });

  it('subtracts without going negative', () => {
    const a = Money.create(500, 'BDT');
    const b = Money.create(250, 'BDT');
    expect(a.subtract(b).amountMinorUnits).toBe(250);
    expect(() => b.subtract(a)).toThrow('negative');
  });

  it('multiplies and rounds to minor units', () => {
    const price = Money.create(333, 'BDT');
    expect(price.multiply(3).amountMinorUnits).toBe(999);
  });
});
