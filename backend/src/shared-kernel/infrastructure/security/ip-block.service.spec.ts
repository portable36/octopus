import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { IpBlockService } from './ip-block.service';
import { BlockedIpOrmEntity } from '../persistence/blocked-ip.orm-entity';

type EmStub = {
  transactional: (fn: (tem: EmStub) => Promise<unknown>) => Promise<unknown>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  persist: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  flush: ReturnType<typeof vi.fn>;
  getConnection: () => { execute: ReturnType<typeof vi.fn> };
};

describe('IpBlockService', () => {
  let redis: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  let audit: { append: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
    };
    audit = { append: vi.fn().mockResolvedValue(undefined) };
  });

  it('creates a block, refreshes cache, and audits', async () => {
    const store: BlockedIpOrmEntity[] = [];
    const em: EmStub = {
      transactional: async (fn) => fn(em),
      find: vi.fn(async () => store.filter((r) => r.isActive)),
      findOne: vi.fn(async () => null),
      create: vi.fn((_e: unknown, data: Partial<BlockedIpOrmEntity>) =>
        Object.assign(new BlockedIpOrmEntity(), data),
      ),
      persist: vi.fn((row: BlockedIpOrmEntity) => {
        store.push(row);
      }),
      remove: vi.fn(),
      flush: vi.fn(async () => undefined),
      getConnection: () => ({ execute: vi.fn(async () => undefined) }),
    };
    const service = new IpBlockService(em as never, redis as never, audit as never);

    const created = await service.create({
      ipCidr: '203.0.113.10',
      reason: 'abuse',
      createdBy: '11111111-1111-7111-8111-111111111111',
    });

    expect(created.ipCidr).toBe('203.0.113.10');
    expect(redis.set).toHaveBeenCalled();
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'security.ip_block.created' }),
    );
  });

  it('conflicts on duplicate IP', async () => {
    const existing = Object.assign(new BlockedIpOrmEntity(), {
      id: '22222222-2222-7222-8222-222222222222',
      ipCidr: '203.0.113.10',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const em: EmStub = {
      transactional: async (fn) => fn(em),
      findOne: vi.fn(async () => existing),
      find: vi.fn(async () => [existing]),
      create: vi.fn(),
      persist: vi.fn(),
      remove: vi.fn(),
      flush: vi.fn(),
      getConnection: () => ({ execute: vi.fn(async () => undefined) }),
    };
    const service = new IpBlockService(em as never, redis as never, audit as never);
    await expect(
      service.create({ ipCidr: '203.0.113.10', createdBy: null }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('treats expired cache entries as not blocked', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify([{ ipCidr: '203.0.113.10', expiresAt: '2020-01-01T00:00:00.000Z' }]),
    );
    const em: EmStub = {
      transactional: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      persist: vi.fn(),
      remove: vi.fn(),
      flush: vi.fn(),
      getConnection: () => ({ execute: vi.fn() }),
    };
    const service = new IpBlockService(em as never, redis as never, audit as never);
    await expect(service.isBlocked('203.0.113.10')).resolves.toBe(false);
  });

  it('updates reason/active and audits', async () => {
    const row = Object.assign(new BlockedIpOrmEntity(), {
      id: '33333333-3333-7333-8333-333333333333',
      ipCidr: '198.51.100.1',
      reason: 'old',
      expiresAt: null,
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const em: EmStub = {
      transactional: async (fn) => fn(em),
      findOne: vi.fn(async () => row),
      find: vi.fn(async () => [row]),
      create: vi.fn(),
      persist: vi.fn(),
      remove: vi.fn(),
      flush: vi.fn(async () => undefined),
      getConnection: () => ({ execute: vi.fn(async () => undefined) }),
    };
    const service = new IpBlockService(em as never, redis as never, audit as never);
    const updated = await service.update({
      id: row.id,
      reason: 'new reason',
      isActive: false,
      actorUserId: '11111111-1111-7111-8111-111111111111',
    });
    expect(updated.reason).toBe('new reason');
    expect(updated.isActive).toBe(false);
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'security.ip_block.updated' }),
    );
  });
});
