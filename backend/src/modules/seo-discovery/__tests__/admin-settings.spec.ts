import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SYSTEM_SETTING_KEYS } from '../domain/system-setting-keys';
import { SystemSetting } from '../infrastructure/entities/system-setting.entity';
import {
  SYSTEM_SETTING_CACHE_PREFIX,
  SystemSettingsService,
} from '../application/services/system-settings.service';

function createEntityManagerMock() {
  const store = new Map<string, SystemSetting>();

  return {
    findOne: vi.fn(async (_entity: unknown, where: { key: string }) => {
      return store.get(where.key) ?? null;
    }),
    create: vi.fn(
      (_entity: unknown, data: { key: string; value: unknown; updatedAt: Date }) => {
        const row = { ...data } as SystemSetting;
        store.set(data.key, row);
        return row;
      },
    ),
    persist: vi.fn((row: SystemSetting) => {
      store.set(row.key, row);
    }),
    flush: vi.fn(async () => undefined),
    __store: store,
  };
}

describe('admin system settings', () => {
  const redis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };

  let em: ReturnType<typeof createEntityManagerMock>;
  let service: SystemSettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    em = createEntityManagerMock();
    service = new SystemSettingsService(em as never, redis as never);
  });

  it('reads through Redis on hit without querying PostgreSQL', async () => {
    redis.get.mockResolvedValueOnce(JSON.stringify('pixel-from-cache'));

    const value = await service.getSetting<string>(SYSTEM_SETTING_KEYS.META_PIXEL_ID);

    expect(value).toBe('pixel-from-cache');
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it('loads from PostgreSQL on cache miss and writes a 24-hour Redis entry', async () => {
    redis.get.mockResolvedValueOnce(null);
    em.__store.set(SYSTEM_SETTING_KEYS.META_PIXEL_ID, {
      key: SYSTEM_SETTING_KEYS.META_PIXEL_ID,
      value: 'db-pixel-id',
      updatedAt: new Date(),
    });

    const value = await service.getSetting<string>(SYSTEM_SETTING_KEYS.META_PIXEL_ID);

    expect(value).toBe('db-pixel-id');
    expect(redis.set).toHaveBeenCalledWith(
      `${SYSTEM_SETTING_CACHE_PREFIX}${SYSTEM_SETTING_KEYS.META_PIXEL_ID}`,
      JSON.stringify('db-pixel-id'),
      'EX',
      86_400,
    );
  });

  it('evicts Redis cache on admin update and returns the new META_PIXEL_ID', async () => {
    em.__store.set(SYSTEM_SETTING_KEYS.META_PIXEL_ID, {
      key: SYSTEM_SETTING_KEYS.META_PIXEL_ID,
      value: 'old-pixel-id',
      updatedAt: new Date(),
    });
    redis.get.mockResolvedValueOnce(JSON.stringify('old-pixel-id'));

    const cachedBefore = await service.getSetting<string>(SYSTEM_SETTING_KEYS.META_PIXEL_ID);
    expect(cachedBefore).toBe('old-pixel-id');

    await service.updateSettings({
      [SYSTEM_SETTING_KEYS.META_PIXEL_ID]: 'new-pixel-id',
    });

    expect(redis.del).toHaveBeenCalledWith(
      `${SYSTEM_SETTING_CACHE_PREFIX}${SYSTEM_SETTING_KEYS.META_PIXEL_ID}`,
    );

    redis.get.mockResolvedValueOnce(null);
    const afterUpdate = await service.getSetting<string>(SYSTEM_SETTING_KEYS.META_PIXEL_ID);
    expect(afterUpdate).toBe('new-pixel-id');
    expect(em.__store.get(SYSTEM_SETTING_KEYS.META_PIXEL_ID)?.value).toBe('new-pixel-id');
  });

  it('rejects unsupported setting keys', async () => {
    await expect(
      service.updateSettings({ UNKNOWN_SETTING_KEY: 'value' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
