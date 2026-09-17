import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationRepositoryAdapter } from './notification.repository.adapter';
import { NotificationPushDeviceOrmEntity } from './notification-push-device.orm-entity';

describe('NotificationRepositoryAdapter push devices', () => {
  let store: NotificationPushDeviceOrmEntity[];
  let adapter: NotificationRepositoryAdapter;

  beforeEach(() => {
    store = [];
    const inner = {
      findOne: vi.fn(
        async (
          _entity: unknown,
          where: { userId?: string; tokenFingerprint?: string; id?: string },
        ) => {
          return (
            store.find((row) => {
              if (where.id && where.userId) {
                return row.id === where.id && row.userId === where.userId;
              }
              if (where.userId && where.tokenFingerprint) {
                return (
                  row.userId === where.userId && row.tokenFingerprint === where.tokenFingerprint
                );
              }
              return false;
            }) ?? null
          );
        },
      ),
      find: vi.fn(async (_entity: unknown, where: { userId: string; revokedAt: null }) => {
        return store.filter((row) => row.userId === where.userId && row.revokedAt === null);
      }),
      persistAndFlush: vi.fn(async (row: NotificationPushDeviceOrmEntity) => {
        store.push(row);
      }),
      flush: vi.fn(async () => undefined),
      persist: vi.fn(),
      getConnection: () => ({ execute: vi.fn(async () => undefined) }),
    };
    const em = {
      transactional: async (fn: (tx: typeof inner) => Promise<unknown>) => fn(inner),
      getConnection: () => ({ execute: vi.fn(async () => undefined) }),
    };
    adapter = new NotificationRepositoryAdapter(em as never);
  });

  it('upserts the same token fingerprint into one row', async () => {
    const token = 'device-token-abc';
    const first = await adapter.upsertPushDevice({
      userId: 'u1',
      platform: 'web',
      token,
      label: 'laptop',
    });
    const second = await adapter.upsertPushDevice({
      userId: 'u1',
      platform: 'web',
      token,
      label: 'laptop-2',
    });

    expect(first.id).toBe(second.id);
    expect(store).toHaveLength(1);
    expect(store[0]!.tokenFingerprint).toBe(createHash('sha256').update(token).digest('hex'));
    expect(store[0]!.label).toBe('laptop-2');
    expect(store[0]!.revokedAt).toBeNull();
  });
});
