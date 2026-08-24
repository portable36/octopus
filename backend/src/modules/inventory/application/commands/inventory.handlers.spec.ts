import { describe, expect, it, vi } from 'vitest';
import { InventoryAccessDeniedError } from '../errors/inventory.errors';
import { WarehouseCommandHandler } from './inventory.handlers';

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
