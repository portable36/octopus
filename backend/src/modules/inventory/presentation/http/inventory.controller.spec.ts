import { describe, expect, it, vi } from 'vitest';
import { InventoryController } from './inventory.controller';

describe('InventoryController', () => {
  const mockStockHandler = {
    listLowStock: vi.fn(async (input: { storeId: string; limit?: number }) => [
      {
        id: 'item-1',
        storeId: input.storeId,
        warehouseId: 'wh-1',
        warehouseName: 'Main Hub',
        variantId: 'var-1',
        onHand: 2,
        reserved: 0,
        available: 2,
        lowStockThreshold: 10,
        stockStatus: 'LOW_STOCK',
        updatedAt: new Date('2026-09-07T10:00:00.000Z'),
      },
    ]),
    listByStore: vi.fn(async () => []),
  };

  const controller = new InventoryController({} as never, mockStockHandler as never, {} as never);

  it('delegates listLowStock to stock handler with parsed limit and formats dates', async () => {
    const user = { userId: 'u-1', roles: ['STORE_STAFF'] };
    const res = await controller.listLowStock(user as never, 's-1', '25');

    expect(mockStockHandler.listLowStock).toHaveBeenCalledWith({
      storeId: 's-1',
      actorUserId: 'u-1',
      actorRoles: ['STORE_STAFF'],
      limit: 25,
    });
    expect(res).toHaveLength(1);
    expect(res[0]?.warehouseName).toBe('Main Hub');
    expect(res[0]?.stockStatus).toBe('LOW_STOCK');
    expect(res[0]?.updatedAt).toBe('2026-09-07T10:00:00.000Z');
  });
});
