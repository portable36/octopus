import { describe, expect, it, vi } from 'vitest';
import { OrderAccessDeniedError } from '../errors/order.errors';
import { OrderLifecycleHandler } from './order.handlers';

describe('OrderLifecycleHandler.listRecentForPlatform', () => {
  it('rejects non-platform actors', async () => {
    const orders = { listRecent: vi.fn() };
    const handler = new OrderLifecycleHandler(orders as never, {} as never);
    await expect(
      handler.listRecentForPlatform({ actorRoles: ['CUSTOMER'], limit: 10 }),
    ).rejects.toBeInstanceOf(OrderAccessDeniedError);
    expect(orders.listRecent).not.toHaveBeenCalled();
  });

  it('lists recent orders for platform admin', async () => {
    const rows = [{ id: { value: 'o1' } }];
    const orders = { listRecent: vi.fn().mockResolvedValue(rows) };
    const handler = new OrderLifecycleHandler(orders as never, {} as never);
    const result = await handler.listRecentForPlatform({
      actorRoles: ['PLATFORM_ADMIN'],
      limit: 25,
    });
    expect(orders.listRecent).toHaveBeenCalledWith(25);
    expect(result).toBe(rows);
  });
});
