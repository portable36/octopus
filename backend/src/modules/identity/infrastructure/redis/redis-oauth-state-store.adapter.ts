import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type {
  OAuthStateRecord,
  OAuthStateStore,
} from '../../application/ports/oauth-state-store.interface';

const STATE_PREFIX = 'identity:oauth-state:';

@Injectable()
export class RedisOAuthStateStoreAdapter implements OAuthStateStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async store(state: string, record: OAuthStateRecord): Promise<void> {
    const ttlSeconds = Math.max(1, Math.ceil((record.expiresAt.getTime() - Date.now()) / 1000));
    await this.redis.set(`${STATE_PREFIX}${state}`, JSON.stringify(record), 'EX', ttlSeconds);
  }

  public async consume(state: string): Promise<OAuthStateRecord | null> {
    const key = `${STATE_PREFIX}${state}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }

    await this.redis.del(key);
    const parsed = JSON.parse(raw) as OAuthStateRecord & { expiresAt: string };
    return {
      provider: parsed.provider,
      expiresAt: new Date(parsed.expiresAt),
    };
  }
}
