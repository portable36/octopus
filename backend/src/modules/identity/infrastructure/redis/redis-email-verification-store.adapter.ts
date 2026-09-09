import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type {
  EmailVerificationRecord,
  EmailVerificationStore,
} from '../../application/ports/email-verification-store.interface';

const VERIFY_PREFIX = 'identity:email-verify:';

@Injectable()
export class RedisEmailVerificationStoreAdapter implements EmailVerificationStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async store(tokenHash: string, record: EmailVerificationRecord): Promise<void> {
    const ttlSeconds = Math.max(1, Math.ceil((record.expiresAt.getTime() - Date.now()) / 1000));
    await this.redis.set(`${VERIFY_PREFIX}${tokenHash}`, JSON.stringify(record), 'EX', ttlSeconds);
  }

  public async consume(tokenHash: string): Promise<EmailVerificationRecord | null> {
    const key = `${VERIFY_PREFIX}${tokenHash}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }

    await this.redis.del(key);
    const parsed = JSON.parse(raw) as EmailVerificationRecord & { expiresAt: string };
    return {
      userId: parsed.userId,
      expiresAt: new Date(parsed.expiresAt),
    };
  }
}
