import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import { isAllowedSystemSettingKey } from '../../domain/system-setting-keys';
import { SystemSetting } from '../../infrastructure/entities/system-setting.entity';

export const SYSTEM_SETTING_CACHE_PREFIX = 'seo:system-setting:';
export const SYSTEM_SETTING_CACHE_TTL_SECONDS = 86_400;

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(
    private readonly em: EntityManager,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /** Redis-first lookup; on miss loads from PostgreSQL and caches for 24 hours. */
  public async getSetting<T>(key: string): Promise<T | null> {
    const cacheKey = this.cacheKey(key);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      this.logger.warn(
        `System setting cache read failed for ${key}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const row = await this.em.findOne(SystemSetting, { key });
    if (!row) {
      return null;
    }

    try {
      await this.redis.set(
        cacheKey,
        JSON.stringify(row.value),
        'EX',
        SYSTEM_SETTING_CACHE_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(
        `System setting cache write failed for ${key}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return row.value as T;
  }

  public async updateSettings(
    settings: Record<string, unknown>,
  ): Promise<{ readonly updated: readonly string[] }> {
    const entries = Object.entries(settings);
    if (entries.length === 0) {
      return { updated: [] };
    }

    const invalidKeys = entries.map(([key]) => key).filter((key) => !isAllowedSystemSettingKey(key));
    if (invalidKeys.length > 0) {
      throw new BadRequestException(`Unsupported system setting keys: ${invalidKeys.join(', ')}`);
    }

    const updated: string[] = [];
    const now = new Date();

    for (const [key, value] of entries) {
      let row = await this.em.findOne(SystemSetting, { key });
      if (!row) {
        row = this.em.create(SystemSetting, { key, value, updatedAt: now });
      } else {
        row.value = value;
        row.updatedAt = now;
      }
      this.em.persist(row);
      updated.push(key);
    }

    await this.em.flush();
    await this.evictCacheKeys(updated);

    return { updated };
  }

  public async listAllSettings(): Promise<Record<string, unknown>> {
    const rows = await this.em.find(SystemSetting, {});
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  public async evictCacheKeys(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    try {
      await this.redis.del(...keys.map((key) => this.cacheKey(key)));
    } catch (error) {
      this.logger.warn(
        `System setting cache eviction failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private cacheKey(key: string): string {
    return `${SYSTEM_SETTING_CACHE_PREFIX}${key}`;
  }
}
