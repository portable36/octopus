import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GLOBAL_CONFIG_CACHE_PREFIX,
  GlobalConfigService,
} from '../application/services/global-config.service';
import {
  GLOBAL_CONFIG_GROUPS,
  GLOBAL_CONFIG_KEYS,
} from '../domain/global-config-keys';
import { GlobalSetting } from '../infrastructure/entities/global-setting.entity';

function createEntityManagerMock() {
  const store = new Map<string, GlobalSetting>();

  return {
    findOne: vi.fn(async (_entity: unknown, where: { group: string; key: string }) => {
      return store.get(`${where.group}:${where.key}`) ?? null;
    }),
    find: vi.fn(async () => [...store.values()]),
    create: vi.fn(
      (
        _entity: unknown,
        data: { group: string; key: string; value: unknown; updatedAt: Date },
      ) => {
        const row = { ...data } as GlobalSetting;
        store.set(`${data.group}:${data.key}`, row);
        return row;
      },
    ),
    persist: vi.fn((row: GlobalSetting) => {
      store.set(`${row.group}:${row.key}`, row);
    }),
    flush: vi.fn(async () => undefined),
    __store: store,
  };
}

describe('global configuration', () => {
  const redis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };

  let em: ReturnType<typeof createEntityManagerMock>;
  let service: GlobalConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    em = createEntityManagerMock();
    service = new GlobalConfigService(em as never, redis as never);
  });

  it('reads through Redis on hit without querying PostgreSQL', async () => {
    redis.get.mockResolvedValueOnce(JSON.stringify(50_000));

    const value = await service.get<number>(
      GLOBAL_CONFIG_GROUPS.SHIPPING,
      GLOBAL_CONFIG_KEYS.shipping.FREE_SHIPPING_THRESHOLD_MINOR,
    );

    expect(value).toBe(50_000);
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it('loads from PostgreSQL on cache miss and writes a 24-hour Redis entry', async () => {
    redis.get.mockResolvedValueOnce(null);
    em.__store.set('shipping:free_shipping_threshold_minor', {
      group: GLOBAL_CONFIG_GROUPS.SHIPPING,
      key: GLOBAL_CONFIG_KEYS.shipping.FREE_SHIPPING_THRESHOLD_MINOR,
      value: 25_000,
      updatedAt: new Date(),
    });

    const value = await service.get<number>(
      GLOBAL_CONFIG_GROUPS.SHIPPING,
      GLOBAL_CONFIG_KEYS.shipping.FREE_SHIPPING_THRESHOLD_MINOR,
    );

    expect(value).toBe(25_000);
    expect(redis.set).toHaveBeenCalledWith(
      `${GLOBAL_CONFIG_CACHE_PREFIX}shipping:free_shipping_threshold_minor`,
      JSON.stringify(25_000),
      'EX',
      86_400,
    );
  });

  it('evicts Redis on payment threshold update and checkout reads the new value', async () => {
    em.__store.set('shipping:free_shipping_threshold_minor', {
      group: GLOBAL_CONFIG_GROUPS.SHIPPING,
      key: GLOBAL_CONFIG_KEYS.shipping.FREE_SHIPPING_THRESHOLD_MINOR,
      value: 10_000,
      updatedAt: new Date(),
    });
    redis.get.mockResolvedValueOnce(JSON.stringify(10_000));

    const cachedBefore = await service.get<number>(
      GLOBAL_CONFIG_GROUPS.SHIPPING,
      GLOBAL_CONFIG_KEYS.shipping.FREE_SHIPPING_THRESHOLD_MINOR,
    );
    expect(cachedBefore).toBe(10_000);

    await service.set(
      GLOBAL_CONFIG_GROUPS.SHIPPING,
      GLOBAL_CONFIG_KEYS.shipping.FREE_SHIPPING_THRESHOLD_MINOR,
      75_000,
    );

    expect(redis.del).toHaveBeenCalledWith(
      `${GLOBAL_CONFIG_CACHE_PREFIX}shipping:free_shipping_threshold_minor`,
    );

    redis.get.mockResolvedValueOnce(null);
    const storefrontThreshold = await service.get<number>(
      GLOBAL_CONFIG_GROUPS.SHIPPING,
      GLOBAL_CONFIG_KEYS.shipping.FREE_SHIPPING_THRESHOLD_MINOR,
    );
    expect(storefrontThreshold).toBe(75_000);
    expect(em.__store.get('shipping:free_shipping_threshold_minor')?.value).toBe(75_000);
  });

  it('rejects unsupported global config keys', async () => {
    await expect(service.set('unknown', 'key', true)).rejects.toBeInstanceOf(BadRequestException);
  });
});
