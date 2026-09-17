import { describe, expect, it } from 'vitest';
import { countUniqueCustomers } from './count-unique-customers';

describe('countUniqueCustomers', () => {
  it('counts distinct non-null customer ids', () => {
    expect(
      countUniqueCustomers([
        { customerId: 'c1' },
        { customerId: 'c2' },
        { customerId: 'c1' },
        { customerId: null },
      ]),
    ).toBe(2);
  });

  it('returns 0 when every row is guest or empty', () => {
    expect(countUniqueCustomers([])).toBe(0);
    expect(countUniqueCustomers([{ customerId: null }, { customerId: null }])).toBe(0);
  });
});
