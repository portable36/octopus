import { describe, expect, it } from 'vitest';
import {
  InvalidIpCidrError,
  ipMatchesCidr,
  isBlockedByEntries,
  normalizeClientIp,
  normalizeIpCidr,
} from './ip-cidr';

describe('normalizeClientIp', () => {
  it('normalizes IPv4-mapped IPv6', () => {
    expect(normalizeClientIp('::ffff:203.0.113.10')).toBe('203.0.113.10');
  });

  it('rejects garbage', () => {
    expect(normalizeClientIp('not-an-ip')).toBeNull();
  });
});

describe('normalizeIpCidr', () => {
  it('accepts bare IPv4', () => {
    expect(normalizeIpCidr(' 203.0.113.10 ')).toBe('203.0.113.10');
  });

  it('accepts CIDR', () => {
    expect(normalizeIpCidr('10.0.0.0/8')).toBe('10.0.0.0/8');
  });

  it('rejects bad prefix', () => {
    expect(() => normalizeIpCidr('10.0.0.0/99')).toThrow(InvalidIpCidrError);
  });
});

describe('ipMatchesCidr', () => {
  it('matches exact IPv4', () => {
    expect(ipMatchesCidr('203.0.113.10', '203.0.113.10')).toBe(true);
    expect(ipMatchesCidr('203.0.113.11', '203.0.113.10')).toBe(false);
  });

  it('matches IPv4 CIDR', () => {
    expect(ipMatchesCidr('10.1.2.3', '10.0.0.0/8')).toBe(true);
    expect(ipMatchesCidr('11.0.0.1', '10.0.0.0/8')).toBe(false);
  });

  it('matches via mapped IPv6 client', () => {
    expect(ipMatchesCidr('::ffff:10.1.2.3', '10.0.0.0/8')).toBe(true);
  });
});

describe('isBlockedByEntries', () => {
  it('skips expired entries', () => {
    const past = new Date('2020-01-01T00:00:00.000Z');
    expect(
      isBlockedByEntries(
        '203.0.113.10',
        [{ ipCidr: '203.0.113.10', expiresAt: past }],
        new Date('2024-01-01T00:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('blocks active permanent entries', () => {
    expect(isBlockedByEntries('203.0.113.10', [{ ipCidr: '203.0.113.10', expiresAt: null }])).toBe(
      true,
    );
  });
});
