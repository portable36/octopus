import { isIP } from 'node:net';

export class InvalidIpCidrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidIpCidrError';
  }
}

type ParsedCidr = {
  readonly version: 4 | 6;
  readonly network: bigint;
  readonly prefix: number;
};

/** Strip IPv4-mapped IPv6 prefix so `::ffff:1.2.3.4` matches IPv4 rules. */
export function normalizeClientIp(raw: string | undefined | null): string | null {
  if (!raw) {
    return null;
  }
  let value = raw.trim().toLowerCase();
  if (value.startsWith('::ffff:')) {
    value = value.slice('::ffff:'.length);
  }
  // Express may leave zone id on IPv6 (fe80::1%eth0)
  const zoneIdx = value.indexOf('%');
  if (zoneIdx >= 0) {
    value = value.slice(0, zoneIdx);
  }
  if (!isIP(value)) {
    return null;
  }
  return value;
}

export function normalizeIpCidr(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    throw new InvalidIpCidrError('IP or CIDR is required.');
  }

  const slash = trimmed.indexOf('/');
  const addrPart = slash >= 0 ? trimmed.slice(0, slash) : trimmed;
  const prefixPart = slash >= 0 ? trimmed.slice(slash + 1) : null;

  const addr = normalizeClientIp(addrPart);
  if (!addr) {
    throw new InvalidIpCidrError(`Invalid IP address: ${addrPart}`);
  }

  const version = isIP(addr) as 4 | 6;
  const maxPrefix = version === 4 ? 32 : 128;

  if (prefixPart === null) {
    return addr;
  }

  if (!/^\d+$/.test(prefixPart)) {
    throw new InvalidIpCidrError(`Invalid CIDR prefix: ${prefixPart}`);
  }
  const prefix = Number(prefixPart);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > maxPrefix) {
    throw new InvalidIpCidrError(`CIDR prefix must be 0–${maxPrefix} for IPv${version}.`);
  }

  return `${addr}/${prefix}`;
}

function ipv4ToBigInt(ip: string): bigint {
  return ip.split('.').reduce((acc, octet) => (acc << 8n) + BigInt(Number(octet)), 0n);
}

function ipv6ToBigInt(ip: string): bigint {
  const [head, tail] = ip.split('::');
  const headParts = head && head.length > 0 ? head.split(':') : [];
  const tailParts = tail && tail.length > 0 ? tail.split(':') : [];
  const missing = 8 - headParts.length - tailParts.length;
  const parts = [
    ...headParts,
    ...Array.from({ length: Math.max(0, missing) }, () => '0'),
    ...tailParts,
  ];
  if (parts.length !== 8) {
    throw new InvalidIpCidrError(`Invalid IPv6 address: ${ip}`);
  }
  return parts.reduce((acc, part) => (acc << 16n) + BigInt(parseInt(part || '0', 16)), 0n);
}

function parseCidr(cidr: string): ParsedCidr {
  const normalized = normalizeIpCidr(cidr);
  const slash = normalized.indexOf('/');
  const addr = slash >= 0 ? normalized.slice(0, slash) : normalized;
  const version = isIP(addr) as 4 | 6;
  const maxPrefix = version === 4 ? 32 : 128;
  const prefix = slash >= 0 ? Number(normalized.slice(slash + 1)) : maxPrefix;
  const network = version === 4 ? ipv4ToBigInt(addr) : ipv6ToBigInt(addr);
  const hostBits = BigInt(maxPrefix - prefix);
  const mask = hostBits === 0n ? (1n << BigInt(maxPrefix)) - 1n : ~((1n << hostBits) - 1n);
  return {
    version,
    network: network & mask,
    prefix,
  };
}

/** True when `clientIp` falls inside `cidr` (exact IP or prefix). */
export function ipMatchesCidr(clientIp: string, cidr: string): boolean {
  const ip = normalizeClientIp(clientIp);
  if (!ip) {
    return false;
  }
  let parsed: ParsedCidr;
  try {
    parsed = parseCidr(cidr);
  } catch {
    return false;
  }
  const version = isIP(ip) as 4 | 6;
  if (version !== parsed.version) {
    return false;
  }
  const addr = version === 4 ? ipv4ToBigInt(ip) : ipv6ToBigInt(ip);
  const maxPrefix = version === 4 ? 32 : 128;
  const hostBits = BigInt(maxPrefix - parsed.prefix);
  const mask = hostBits === 0n ? (1n << BigInt(maxPrefix)) - 1n : ~((1n << hostBits) - 1n);
  return (addr & mask) === parsed.network;
}

export function isBlockedByEntries(
  clientIp: string | undefined | null,
  entries: readonly { readonly ipCidr: string; readonly expiresAt?: Date | string | null }[],
  now: Date = new Date(),
): boolean {
  const ip = normalizeClientIp(clientIp);
  if (!ip) {
    return false;
  }
  for (const entry of entries) {
    if (entry.expiresAt) {
      const expires = entry.expiresAt instanceof Date ? entry.expiresAt : new Date(entry.expiresAt);
      if (Number.isFinite(expires.getTime()) && expires.getTime() <= now.getTime()) {
        continue;
      }
    }
    if (ipMatchesCidr(ip, entry.ipCidr)) {
      return true;
    }
  }
  return false;
}
