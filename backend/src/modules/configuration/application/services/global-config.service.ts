import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import {
  GLOBAL_CONFIG_DEFAULTS,
  isAllowedGlobalConfigKey,
  resolveGlobalConfigDefault,
} from '../../domain/global-config-keys';
import { parseGlobalConfigValue } from '../../domain/global-config.schema';
import { GlobalSetting } from '../../infrastructure/entities/global-setting.entity';

export const GLOBAL_CONFIG_CACHE_PREFIX = 'global-config:';
export const GLOBAL_CONFIG_CACHE_TTL_SECONDS = 86_400;

@Injectable()
export class GlobalConfigService {
  private readonly logger = new Logger(GlobalConfigService.name);

  constructor(
    private readonly em: EntityManager,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /** Redis-first lookup; on miss loads from PostgreSQL, caches for 24 hours. */
  public async get<T>(group: string, key: string, defaultValue?: T): Promise<T> {
    const cacheKey = this.cacheKey(group, key);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      this.logger.warn(
        `Global config cache read failed for ${group}.${key}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const row = await this.em.findOne(GlobalSetting, { group, key });
    if (row) {
      try {
        await this.redis.set(
          cacheKey,
          JSON.stringify(row.value),
          'EX',
          GLOBAL_CONFIG_CACHE_TTL_SECONDS,
        );
      } catch (error) {
        this.logger.warn(
          `Global config cache write failed for ${group}.${key}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      return row.value as T;
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    const fallback = resolveGlobalConfigDefault(group, key);
    return fallback as T;
  }

  public async set(group: string, key: string, value: unknown): Promise<void> {
    if (!isAllowedGlobalConfigKey(group, key)) {
      throw new BadRequestException(`Unsupported global config key: ${group}.${key}`);
    }

    const parsed = parseGlobalConfigValue(group, key, value);
    const now = new Date();
    let row = await this.em.findOne(GlobalSetting, { group, key });
    if (!row) {
      row = this.em.create(GlobalSetting, { group, key, value: parsed, updatedAt: now });
    } else {
      row.value = parsed;
      row.updatedAt = now;
    }
    this.em.persist(row);
    await this.em.flush();
    await this.evictCacheKey(group, key);
  }

  public async listGrouped(): Promise<Record<string, Record<string, unknown>>> {
    const grouped = structuredClone(GLOBAL_CONFIG_DEFAULTS);
    const rows = await this.em.find(GlobalSetting, {});
    for (const row of rows) {
      grouped[row.group] ??= {};
      grouped[row.group]![row.key] = row.value;
    }
    return grouped;
  }

  public async bulkUpdate(
    settings: Record<string, Record<string, unknown>>,
  ): Promise<{ readonly updated: readonly string[] }> {
    const updated: string[] = [];

    for (const [group, entries] of Object.entries(settings)) {
      for (const [key, value] of Object.entries(entries)) {
        await this.set(group, key, value);
        updated.push(`${group}.${key}`);
      }
    }

    return { updated };
  }

  public async evictCacheKey(group: string, key: string): Promise<void> {
    try {
      await this.redis.del(this.cacheKey(group, key));
    } catch (error) {
      this.logger.warn(
        `Global config cache eviction failed for ${group}.${key}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private cacheKey(group: string, key: string): string {
    return `${GLOBAL_CONFIG_CACHE_PREFIX}${group}:${key}`;
  }
}
