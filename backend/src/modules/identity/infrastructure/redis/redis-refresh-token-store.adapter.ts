import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type {
  RefreshTokenRecord,
  RefreshTokenStore,
} from '../../application/ports/refresh-token-store.interface';

const TOKEN_PREFIX = 'identity:refresh:';
const FAMILY_PREFIX = 'identity:refresh-family:';
const USER_FAMILIES_PREFIX = 'identity:user-families:';

@Injectable()
export class RedisRefreshTokenStoreAdapter implements RefreshTokenStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async store(tokenHash: string, record: RefreshTokenRecord): Promise<void> {
    const ttlSeconds = Math.max(1, Math.ceil((record.expiresAt.getTime() - Date.now()) / 1000));
    const key = this.tokenKey(tokenHash);
    await this.redis.set(key, JSON.stringify(record), 'EX', ttlSeconds);
    await this.redis.sadd(this.familyKey(record.familyId), tokenHash);
    await this.redis.expire(this.familyKey(record.familyId), ttlSeconds);
  }

  public async find(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const raw = await this.redis.get(this.tokenKey(tokenHash));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as RefreshTokenRecord & { expiresAt: string };
    return {
      ...parsed,
      expiresAt: new Date(parsed.expiresAt),
    };
  }

  public async markRevoked(tokenHash: string): Promise<void> {
    const record = await this.find(tokenHash);
    if (!record) {
      return;
    }

    const revoked: RefreshTokenRecord = { ...record, status: 'revoked' };
    const ttlSeconds = Math.max(1, Math.ceil((record.expiresAt.getTime() - Date.now()) / 1000));
    await this.redis.set(this.tokenKey(tokenHash), JSON.stringify(revoked), 'EX', ttlSeconds);
  }

  public async revokeFamily(familyId: string): Promise<void> {
    const members = await this.redis.smembers(this.familyKey(familyId));
    if (members.length === 0) {
      return;
    }

    const pipeline = this.redis.pipeline();
    for (const tokenHash of members) {
      pipeline.del(this.tokenKey(tokenHash));
    }
    pipeline.del(this.familyKey(familyId));
    await pipeline.exec();
  }

  public async trackUserFamily(userId: string, familyId: string): Promise<void> {
    const key = `${USER_FAMILIES_PREFIX}${userId}`;
    await this.redis.sadd(key, familyId);
    // Align with refresh lifetime so the set cannot grow unbounded after expiry.
    const familyTtl = await this.redis.ttl(this.familyKey(familyId));
    if (familyTtl > 0) {
      await this.redis.expire(key, familyTtl);
    }
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    const key = `${USER_FAMILIES_PREFIX}${userId}`;
    const familyIds = await this.redis.smembers(key);
    for (const familyId of familyIds) {
      await this.revokeFamily(familyId);
    }
    await this.redis.del(key);
  }

  private tokenKey(tokenHash: string): string {
    return `${TOKEN_PREFIX}${tokenHash}`;
  }

  private familyKey(familyId: string): string {
    return `${FAMILY_PREFIX}${familyId}`;
  }
}
