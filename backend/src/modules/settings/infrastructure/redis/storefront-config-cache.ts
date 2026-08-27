import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type { ConfigurationScope } from '../../domain/settings.types';
import type { StorefrontPublicConfig } from '../../application/mappers/storefront-public-config';

const GEN_KEY = 'settings:storefront-config:gen';
const KEY_PREFIX = 'settings:storefront-config:';
/** Short TTL; generation bump is the write-path invalidation. */
export const STOREFRONT_CONFIG_CACHE_TTL_SECONDS = 60;

@Injectable()
export class StorefrontConfigCache {
  private readonly logger = new Logger(StorefrontConfigCache.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async get(scope: ConfigurationScope): Promise<StorefrontPublicConfig | null> {
    try {
      const gen = (await this.redis.get(GEN_KEY)) ?? '0';
      const raw = await this.redis.get(this.payloadKey(scope, gen));
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as StorefrontPublicConfig;
    } catch (error) {
      this.logger.warn(
        `Storefront config cache get failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  public async set(scope: ConfigurationScope, value: StorefrontPublicConfig): Promise<void> {
    try {
      const gen = (await this.redis.get(GEN_KEY)) ?? '0';
      await this.redis.set(
        this.payloadKey(scope, gen),
        JSON.stringify(value),
        'EX',
        STOREFRONT_CONFIG_CACHE_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(
        `Storefront config cache set failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Bump generation so all scoped payload keys miss without SCAN. */
  public async invalidateAll(): Promise<void> {
    try {
      await this.redis.incr(GEN_KEY);
      await this.redis.expire(GEN_KEY, 60 * 60 * 24 * 30);
    } catch (error) {
      this.logger.warn(
        `Storefront config cache invalidate failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  public payloadKey(scope: ConfigurationScope, gen: string): string {
    if (scope.kind === 'platform') {
      return `${KEY_PREFIX}${gen}:platform`;
    }
    if (scope.kind === 'vendor') {
      return `${KEY_PREFIX}${gen}:vendor:${scope.vendorId}`;
    }
    return `${KEY_PREFIX}${gen}:store:${scope.vendorId}:${scope.storeId}`;
  }
}
