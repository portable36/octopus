import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type {
  MfaChallengeRecord,
  MfaChallengeStore,
  MfaSetupStore,
} from '../../application/ports/mfa-store.interface';

const CHALLENGE_PREFIX = 'identity:mfa-challenge:';
const SETUP_PREFIX = 'identity:mfa-setup:';

@Injectable()
export class RedisMfaChallengeStoreAdapter implements MfaChallengeStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async create(userId: string, ttlSeconds: number): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const record: MfaChallengeRecord = {
      userId,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };
    await this.redis.set(
      `${CHALLENGE_PREFIX}${token}`,
      JSON.stringify(record),
      'EX',
      Math.max(1, ttlSeconds),
    );
    return token;
  }

  public async consume(token: string): Promise<MfaChallengeRecord | null> {
    const key = `${CHALLENGE_PREFIX}${token}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }
    await this.redis.del(key);
    const parsed = JSON.parse(raw) as MfaChallengeRecord & { expiresAt: string };
    return {
      userId: parsed.userId,
      expiresAt: new Date(parsed.expiresAt),
    };
  }
}

@Injectable()
export class RedisMfaSetupStoreAdapter implements MfaSetupStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async putIfAbsent(
    userId: string,
    secretBase32: string,
    ttlSeconds: number,
  ): Promise<string> {
    const key = `${SETUP_PREFIX}${userId}`;
    const result = await this.redis.set(key, secretBase32, 'EX', Math.max(1, ttlSeconds), 'NX');
    if (result === 'OK') {
      return secretBase32;
    }
    return (await this.redis.get(key)) ?? secretBase32;
  }

  public async put(userId: string, secretBase32: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`${SETUP_PREFIX}${userId}`, secretBase32, 'EX', Math.max(1, ttlSeconds));
  }

  public async take(userId: string): Promise<string | null> {
    const key = `${SETUP_PREFIX}${userId}`;
    const secret = await this.redis.get(key);
    if (!secret) {
      return null;
    }
    await this.redis.del(key);
    return secret;
  }
}
