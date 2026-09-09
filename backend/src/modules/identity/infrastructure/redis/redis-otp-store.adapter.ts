import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type { OtpRecord, OtpStore } from '../../application/ports/otp-store.interface';

const OTP_PREFIX = 'identity:otp:';

@Injectable()
export class RedisOtpStoreAdapter implements OtpStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async store(phoneKey: string, record: OtpRecord): Promise<void> {
    const ttlSeconds = Math.max(1, Math.ceil((record.expiresAt.getTime() - Date.now()) / 1000));
    await this.redis.set(`${OTP_PREFIX}${phoneKey}`, JSON.stringify(record), 'EX', ttlSeconds);
  }

  public async consume(phoneKey: string): Promise<OtpRecord | null> {
    const key = `${OTP_PREFIX}${phoneKey}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }

    await this.redis.del(key);
    const parsed = JSON.parse(raw) as OtpRecord & { expiresAt: string };
    return {
      codeHash: parsed.codeHash,
      expiresAt: new Date(parsed.expiresAt),
    };
  }
}
