import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type {
  PasswordResetRecord,
  PasswordResetStore,
} from '../../application/ports/password-reset-store.interface';

const RESET_PREFIX = 'identity:password-reset:';

@Injectable()
export class RedisPasswordResetStoreAdapter implements PasswordResetStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async store(tokenHash: string, record: PasswordResetRecord): Promise<void> {
    const ttlSeconds = Math.max(1, Math.ceil((record.expiresAt.getTime() - Date.now()) / 1000));
    await this.redis.set(`${RESET_PREFIX}${tokenHash}`, JSON.stringify(record), 'EX', ttlSeconds);
  }

  public async consume(tokenHash: string): Promise<PasswordResetRecord | null> {
    const key = `${RESET_PREFIX}${tokenHash}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }

    await this.redis.del(key);
    const parsed = JSON.parse(raw) as PasswordResetRecord & { expiresAt: string };
    return {
      userId: parsed.userId,
      expiresAt: new Date(parsed.expiresAt),
    };
  }
}
