import { describe, expect, it } from 'vitest';
import { clampLimit, clampOffset, DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from './pagination';

describe('clampLimit', () => {
  it('defaults and caps', () => {
    expect(clampLimit(undefined)).toBe(DEFAULT_LIST_LIMIT);
    expect(clampLimit('0')).toBe(DEFAULT_LIST_LIMIT);
    expect(clampLimit('999')).toBe(MAX_LIST_LIMIT);
    expect(clampLimit(25)).toBe(25);
  });
});

describe('clampOffset', () => {
  it('defaults and floors negatives', () => {
    expect(clampOffset(undefined)).toBe(0);
    expect(clampOffset('-3')).toBe(0);
    expect(clampOffset(10)).toBe(10);
  });
});
