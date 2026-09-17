import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import type Redis from 'ioredis';
import {
  type BlockedIpRecord,
  type CreateBlockedIpInput,
  type IpBlockPort,
  type UpdateBlockedIpInput,
} from '../../application/ports/ip-block.port';
import { AUDIT_PORT, type AuditPort } from '../../application/ports/audit.port';
import { UniqueID } from '../../domain/unique-id.value-object';
import { InvalidIpCidrError, isBlockedByEntries, normalizeIpCidr } from '../../domain/ip-cidr';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { withRlsContext } from '../persistence/rls-session';
import { BlockedIpOrmEntity } from '../persistence/blocked-ip.orm-entity';

export const BLOCKED_IPS_CACHE_KEY = 'security:blocked-ips';

type CacheEntry = {
  readonly ipCidr: string;
  readonly expiresAt: string | null;
};

@Injectable()
export class IpBlockService implements IpBlockPort {
  private readonly logger = new Logger(IpBlockService.name);
  private memoryEntries: CacheEntry[] | null = null;
  private memoryLoadedAt = 0;
  private static readonly MEMORY_TTL_MS = 5_000;

  constructor(
    @Inject(EntityManager) private readonly em: EntityManager,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Optional() @Inject(AUDIT_PORT) private readonly audit: AuditPort | null = null,
  ) {}

  public async isBlocked(clientIp: string | undefined | null): Promise<boolean> {
    const entries = await this.loadActiveEntries();
    return isBlockedByEntries(clientIp, entries);
  }

  public async list(): Promise<readonly BlockedIpRecord[]> {
    return withRlsContext(this.em, async (tem) => {
      const rows = await tem.find(BlockedIpOrmEntity, {}, { orderBy: { createdAt: 'DESC' } });
      return rows.map((row) => this.toRecord(row));
    });
  }

  public async create(input: CreateBlockedIpInput): Promise<BlockedIpRecord> {
    let ipCidr: string;
    try {
      ipCidr = normalizeIpCidr(input.ipCidr);
    } catch (error) {
      if (error instanceof InvalidIpCidrError) {
        throw new BadRequestException({ message: error.message, code: 'INVALID_IP_CIDR' });
      }
      throw error;
    }

    const now = new Date();
    const record = await withRlsContext(this.em, async (tem) => {
      const existing = await tem.findOne(BlockedIpOrmEntity, { ipCidr });
      if (existing) {
        throw new ConflictException({
          message: `IP/CIDR already blocked: ${ipCidr}`,
          code: 'IP_BLOCK_EXISTS',
        });
      }

      const row = tem.create(BlockedIpOrmEntity, {
        id: UniqueID.create().value,
        ipCidr,
        reason: input.reason?.trim() ? input.reason.trim() : null,
        expiresAt: input.expiresAt ?? null,
        isActive: true,
        createdBy: input.createdBy,
        createdAt: now,
        updatedAt: now,
      });
      tem.persist(row);
      try {
        await tem.flush();
      } catch (error) {
        if (error instanceof UniqueConstraintViolationException) {
          throw new ConflictException({
            message: `IP/CIDR already blocked: ${ipCidr}`,
            code: 'IP_BLOCK_EXISTS',
          });
        }
        throw error;
      }
      return this.toRecord(row);
    });

    await this.refreshCache();
    await this.audit?.append({
      actorUserId: input.createdBy,
      action: 'security.ip_block.created',
      resourceType: 'blocked_ip',
      resourceId: record.id,
      after: {
        ipCidr: record.ipCidr,
        reason: record.reason,
        expiresAt: record.expiresAt?.toISOString() ?? null,
      },
    });
    return record;
  }

  public async update(input: UpdateBlockedIpInput): Promise<BlockedIpRecord> {
    const record = await withRlsContext(this.em, async (tem) => {
      const row = await tem.findOne(BlockedIpOrmEntity, { id: input.id });
      if (!row) {
        throw new NotFoundException({
          message: 'Blocked IP not found.',
          code: 'IP_BLOCK_NOT_FOUND',
        });
      }
      const before = this.toRecord(row);
      if (input.reason !== undefined) {
        row.reason = input.reason?.trim() ? input.reason.trim() : null;
      }
      if (input.expiresAt !== undefined) {
        row.expiresAt = input.expiresAt;
      }
      if (input.isActive !== undefined) {
        row.isActive = input.isActive;
      }
      row.updatedAt = new Date();
      await tem.flush();
      return { before, after: this.toRecord(row) };
    });

    await this.refreshCache();
    await this.audit?.append({
      actorUserId: input.actorUserId ?? null,
      action: 'security.ip_block.updated',
      resourceType: 'blocked_ip',
      resourceId: record.after.id,
      before: {
        reason: record.before.reason,
        expiresAt: record.before.expiresAt?.toISOString() ?? null,
        isActive: record.before.isActive,
      },
      after: {
        reason: record.after.reason,
        expiresAt: record.after.expiresAt?.toISOString() ?? null,
        isActive: record.after.isActive,
      },
    });
    return record.after;
  }

  public async delete(id: string, actorUserId?: string | null): Promise<void> {
    const deleted = await withRlsContext(this.em, async (tem) => {
      const row = await tem.findOne(BlockedIpOrmEntity, { id });
      if (!row) {
        throw new NotFoundException({
          message: 'Blocked IP not found.',
          code: 'IP_BLOCK_NOT_FOUND',
        });
      }
      const snapshot = this.toRecord(row);
      tem.remove(row);
      await tem.flush();
      return snapshot;
    });

    await this.refreshCache();
    await this.audit?.append({
      actorUserId: actorUserId ?? null,
      action: 'security.ip_block.deleted',
      resourceType: 'blocked_ip',
      resourceId: deleted.id,
      before: {
        ipCidr: deleted.ipCidr,
        reason: deleted.reason,
        expiresAt: deleted.expiresAt?.toISOString() ?? null,
        isActive: deleted.isActive,
      },
    });
  }

  public async refreshCache(): Promise<void> {
    const entries = await this.loadActiveEntriesFromDb();
    this.memoryEntries = entries;
    this.memoryLoadedAt = Date.now();
    try {
      await this.redis.set(BLOCKED_IPS_CACHE_KEY, JSON.stringify(entries));
    } catch (error) {
      this.logger.warn(
        `Blocked IP Redis cache write failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async loadActiveEntries(): Promise<CacheEntry[]> {
    const now = Date.now();
    if (this.memoryEntries && now - this.memoryLoadedAt < IpBlockService.MEMORY_TTL_MS) {
      return this.memoryEntries;
    }

    try {
      const raw = await this.redis.get(BLOCKED_IPS_CACHE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as CacheEntry[];
        this.memoryEntries = parsed;
        this.memoryLoadedAt = now;
        return parsed;
      }
    } catch (error) {
      this.logger.warn(
        `Blocked IP Redis cache read failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const fromDb = await this.loadActiveEntriesFromDb();
    this.memoryEntries = fromDb;
    this.memoryLoadedAt = now;
    try {
      await this.redis.set(BLOCKED_IPS_CACHE_KEY, JSON.stringify(fromDb));
    } catch {
      // Redis optional for availability; DB fallback already loaded.
    }
    return fromDb;
  }

  private async loadActiveEntriesFromDb(): Promise<CacheEntry[]> {
    const rows = await this.em.find(BlockedIpOrmEntity, { isActive: true });
    const now = Date.now();
    return rows
      .filter((row) => !row.expiresAt || row.expiresAt.getTime() > now)
      .map((row) => ({
        ipCidr: row.ipCidr,
        expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      }));
  }

  private toRecord(row: BlockedIpOrmEntity): BlockedIpRecord {
    return {
      id: row.id,
      ipCidr: row.ipCidr,
      reason: row.reason,
      expiresAt: row.expiresAt,
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
