import { describe, expect, it, vi } from 'vitest';
import { ReturnsController } from './returns.controller';
import type { ReturnsHandlers } from '../../application/commands/returns.handlers';

describe('ReturnsController', () => {
  const mockHandlers = {
    publicLookup: vi.fn(),
    publicRequestReturn: vi.fn(),
    publicGetReturnTimeline: vi.fn(),
    publicCancelReturn: vi.fn(),
    buildReturnTimeline: vi.fn(),
    requestReturn: vi.fn(),
    listByOrder: vi.fn(),
    getReturn: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    receive: vi.fn(),
    inspect: vi.fn(),
  } as unknown as ReturnsHandlers;

  const controller = new ReturnsController(mockHandlers);

  it('lists active customer-selectable reasons', () => {
    const reasons = controller.listReasons();
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.every((r) => r.active && r.customerSelectable)).toBe(true);
  });

  it('delegates public lookup to handler', async () => {
    const expected = { orderNumber: 'ORD-1', returnEligible: true };
    (mockHandlers.publicLookup as ReturnType<typeof vi.fn>).mockResolvedValue(expected);

    const res = await controller.publicLookup({
      orderNumber: 'ORD-1',
      email: 'user@test.com',
    });

    expect(res).toBe(expected);
    expect(mockHandlers.publicLookup).toHaveBeenCalledWith({
      orderNumber: 'ORD-1',
      email: 'user@test.com',
    });
  });

  it('delegates public request return to handler and builds timeline', async () => {
    const mockRet = { id: { value: 'ret-1' }, orderId: 'ord-1' };
    const mockTimeline = { id: 'ret-1', status: 'REQUESTED' };
    (mockHandlers.publicRequestReturn as ReturnType<typeof vi.fn>).mockResolvedValue(mockRet);
    (mockHandlers.buildReturnTimeline as ReturnType<typeof vi.fn>).mockReturnValue(mockTimeline);

    const res = await controller.publicRequest(
      {
        orderNumber: 'ORD-1',
        email: 'user@test.com',
        items: [{ orderItemId: 'item-1', quantity: 1, reasonCode: 'DEFECTIVE' }],
      },
      'idempotency-key-12345',
    );

    expect(res).toBe(mockTimeline);
    expect(mockHandlers.publicRequestReturn).toHaveBeenCalledWith({
      orderNumber: 'ORD-1',
      email: 'user@test.com',
      idempotencyKey: 'idempotency-key-12345',
      items: [{ orderItemId: 'item-1', quantity: 1, reasonCode: 'DEFECTIVE' }],
    });
  });

  it('delegates public timeline lookup and cancellation', async () => {
    const mockTimeline = { id: 'ret-1', status: 'CANCELLED' };
    (mockHandlers.publicGetReturnTimeline as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockTimeline,
    );
    (mockHandlers.publicCancelReturn as ReturnType<typeof vi.fn>).mockResolvedValue(mockTimeline);

    const timeline = await controller.publicGetTimeline('ret-1', 'ORD-1', 'user@test.com');
    expect(timeline).toBe(mockTimeline);

    const cancelled = await controller.publicCancel('ret-1', {
      orderNumber: 'ORD-1',
      email: 'user@test.com',
    });
    expect(cancelled).toBe(mockTimeline);
  });
});
