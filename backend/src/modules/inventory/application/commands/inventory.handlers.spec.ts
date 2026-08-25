import { describe, expect, it, vi } from 'vitest';
import { InventoryItem } from '../../domain/aggregates/inventory-item.aggregate';
import { InventoryAccessDeniedError } from '../errors/inventory.errors';
import { StockCommandHandler, WarehouseCommandHandler } from './inventory.handlers';

describe('WarehouseCommandHandler authorization', () => {
  it('rejects warehouse create for unauthorized actors', async () => {
    const auth = {
      requireMutator: vi.fn().mockRejectedValue(new InventoryAccessDeniedError()),
      requireReader: vi.fn(),
      requireStore: vi.fn(),
      requireWarehouseForStore: vi.fn(),
    };
    const warehouses = {
      save: vi.fn(),
      findById: vi.fn(),
      findByStoreId: vi.fn(),
      findByStoreAndCode: vi.fn(),
    };
    const handler = new WarehouseCommandHandler(warehouses as never, auth as never);

    await expect(
      handler.create({
        storeId: '00000000-0000-7000-8000-000000000002',
        actorUserId: 'outsider',
        actorRoles: ['CUSTOMER'],
        code: 'MAIN',
        name: 'Main',
      }),
    ).rejects.toBeInstanceOf(InventoryAccessDeniedError);
    expect(warehouses.save).not.toHaveBeenCalled();
  });
});

describe('StockCommandHandler.restoreFromReturn', () => {
  it('is idempotent and quarantines unsellable separately from available', async () => {
    const storeId = '00000000-0000-7000-8000-000000000002';
    const warehouseId = '00000000-0000-7000-8000-000000000003';
    const variantId = '00000000-0000-7000-8000-000000000004';
    const item = InventoryItem.create({
      vendorId: '00000000-0000-7000-8000-000000000001',
      storeId,
      warehouseId,
      variantId,
    });

    const ops = new Map<string, Record<string, unknown>>();
    const inventory = {
      findCompletedOperation: vi.fn(async (key: string) => ops.get(key) ?? null),
      recordCompletedOperation: vi.fn(
        async (input: { idempotencyKey: string; result: Record<string, unknown> }) => {
          ops.set(input.idempotencyKey, input.result);
        },
      ),
      withLockedUnitOfWork: vi.fn(async (work: (uow: unknown) => Promise<unknown>) => {
        const uow = {
          findItemByWarehouseAndVariantForUpdate: vi.fn(async () => item),
          findItemByIdForUpdate: vi.fn(async () => item),
          saveItem: vi.fn(async () => undefined),
          appendMovement: vi.fn(async () => undefined),
        };
        return work(uow);
      }),
    };
    const warehouses = {
      findById: vi.fn(async () => ({
        id: { value: warehouseId },
        storeId,
        vendorId: item.vendorId,
        assertActive: () => undefined,
      })),
    };
    const variants = { findById: vi.fn() };
    const auth = {
      requireMutator: vi.fn(),
      requireReader: vi.fn(),
      requireWarehouseForStore: vi.fn(),
    };
    const handler = new StockCommandHandler(
      inventory as never,
      warehouses as never,
      variants as never,
      auth as never,
    );

    const first = await handler.restoreFromReturn({
      returnId: 'ret-1',
      storeId,
      condition: 'DAMAGED',
      lines: [{ variantId, warehouseId, quantity: 2 }],
      actorUserId: 'staff-1',
      idempotencyKey: 'return-restore:ret-1',
    });
    expect(first.disposition).toBe('UNSELLABLE');
    expect(first.restoredQuantity).toBe(2);
    expect(item.unsellableOnHand).toBe(2);
    expect(item.available).toBe(0);

    const second = await handler.restoreFromReturn({
      returnId: 'ret-1',
      storeId,
      condition: 'DAMAGED',
      lines: [{ variantId, warehouseId, quantity: 2 }],
      actorUserId: 'staff-1',
      idempotencyKey: 'return-restore:ret-1',
    });
    expect(second.restoredQuantity).toBe(2);
    expect(item.unsellableOnHand).toBe(2);
    expect(inventory.withLockedUnitOfWork).toHaveBeenCalledTimes(1);
  });
});
