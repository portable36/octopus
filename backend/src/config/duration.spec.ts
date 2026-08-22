import { describe, expect, it } from 'vitest';
import { parseDurationToMs, parseDurationToSeconds } from './duration';

describe('duration parsing', () => {
  it('parses minutes and days', () => {
    expect(parseDurationToSeconds('15m')).toBe(900);
    expect(parseDurationToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('rejects invalid formats', () => {
    expect(() => parseDurationToMs('15')).toThrow('Invalid duration format');
  });
});
