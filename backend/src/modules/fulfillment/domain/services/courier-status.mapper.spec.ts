import { describe, expect, it } from 'vitest';
import { mapPathaoStatus, mapSteadfastStatus, minorToMajorUnits } from './courier-status.mapper';

describe('courier-status.mapper', () => {
  it('maps Steadfast statuses', () => {
    expect(mapSteadfastStatus('in_review')).toBe('PENDING');
    expect(mapSteadfastStatus('delivered')).toBe('DELIVERED');
    expect(mapSteadfastStatus('cancelled')).toBe('FAILED');
    expect(mapSteadfastStatus('hold')).toBe('PROCESSING');
  });

  it('maps Pathao statuses', () => {
    expect(mapPathaoStatus('Pending')).toBe('PENDING');
    expect(mapPathaoStatus('Delivered')).toBe('DELIVERED');
    expect(mapPathaoStatus('Returned')).toBe('RETURNED');
    expect(mapPathaoStatus('In Transit')).toBe('IN_TRANSIT');
  });

  it('converts BDT minor to major for courier APIs', () => {
    expect(minorToMajorUnits(106000, 'BDT')).toBe(1060);
    expect(minorToMajorUnits(0, 'BDT')).toBe(0);
    expect(() => minorToMajorUnits(10.5, 'BDT')).toThrow();
    expect(() => minorToMajorUnits(100, 'XYZ')).toThrow();
  });
});
