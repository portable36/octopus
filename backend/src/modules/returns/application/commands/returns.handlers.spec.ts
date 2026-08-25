import { describe, expect, it, vi } from 'vitest';
import { ReturnsHandlers } from './returns.handlers';
import { ReturnQuantityExceededError } from '../../domain/errors/returns.errors';
import { ReturnsAccessDeniedError } from '../errors/returns.errors';

describe('ReturnsHandlers', () => {
  const orderId = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa';
  const customerId = 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb';
  const lineId = 'cccccccc-cccc-7ccc-8ccc-cccccccccccc';

  function build(overrides?: { readonly listQuantityRowsByOrderId?: ReturnType<typeof vi.fn> }) {
    const returns = {
      findById: vi.fn(),
      listByOrderId: vi.fn().mockResolvedValue([]),
      listByStoreId: vi.fn(),
      listQuantityRowsByOrderId:
        overrides?.listQuantityRowsByOrderId ?? vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
      findOperation: vi.fn().mockResolvedValue(null),
      saveOperation: vi.fn().mockResolvedValue(undefined),
    };
    const orders = {
      getReturnSnapshot: vi.fn().mockResolvedValue({
        orderId,
        orderNumber: 'ORD-1',
        customerId,
        vendorId: 'dddddddd-dddd-7ddd-8ddd-dddddddddddd',
        storeId: 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeeee',
        status: 'FULFILLED',
        paymentStatus: 'PAID',
        paymentMethod: 'COD',
        currencyCode: 'BDT',
        totalMinor: 5000,
        returnWindowAnchorAt: new Date(),
        lines: [
          {
            lineId,
            productId: 'p1',
            variantId: 'v1',
            offerId: 'o1',
            quantity: 5,
            fulfilledQuantity: 5,
            unitPriceMinor: 1000,
            lineSubtotalMinor: 5000,
            lineDiscountMinor: 0,
            lineTaxMinor: 0,
            lineTotalMinor: 5000,
            currencyCode: 'BDT',
            warehouseId: 'w1',
          },
        ],
      }),
    };
    const authz = {
      requirePermission: vi.fn(),
      requireStaffScope: vi.fn(),
      requireCustomerOwner: vi.fn(),
    };
    const inventory = {
      restoreFromReturn: vi.fn().mockResolvedValue({
        returnId: 'r1',
        disposition: 'UNSELLABLE',
        restoredQuantity: 0,
        lineResults: [],
      }),
    };
    const handlers = new ReturnsHandlers(
      returns as never,
      orders as never,
      inventory as never,
      authz as never,
    );
    return { handlers, returns, orders, authz, inventory };
  }

  it('creates a valid partial return request', async () => {
    const { handlers, returns } = build();
    const ret = await handlers.requestReturn({
      orderId,
      actorUserId: customerId,
      actorRoles: ['CUSTOMER'],
      idempotencyKey: 'idem-return-001',
      items: [{ orderItemId: lineId, quantity: 2, reasonCode: 'DAMAGED' }],
    });
    expect(ret.status).toBe('REQUESTED');
    expect(ret.items[0]?.quantity).toBe(2);
    expect(returns.save).toHaveBeenCalled();
  });

  it('rejects quantity above returnable', async () => {
    const { handlers } = build({
      listQuantityRowsByOrderId: vi
        .fn()
        .mockResolvedValue([{ orderItemId: lineId, quantity: 3, status: 'REQUESTED' }]),
    });
    await expect(
      handlers.requestReturn({
        orderId,
        actorUserId: customerId,
        actorRoles: ['CUSTOMER'],
        idempotencyKey: 'idem-return-002',
        items: [{ orderItemId: lineId, quantity: 3, reasonCode: 'SIZE_ISSUE' }],
      }),
    ).rejects.toBeInstanceOf(ReturnQuantityExceededError);
  });

  it('denies vendor B staff approving vendor A return', async () => {
    const { handlers, authz, returns } = build();
    const existing = await handlers.requestReturn({
      orderId,
      actorUserId: customerId,
      actorRoles: ['CUSTOMER'],
      idempotencyKey: 'idem-return-003',
      items: [{ orderItemId: lineId, quantity: 1, reasonCode: 'WRONG_ITEM' }],
    });
    returns.findById.mockResolvedValue(existing);
    authz.requireStaffScope.mockRejectedValue(new ReturnsAccessDeniedError());

    await expect(
      handlers.approve({
        returnId: existing.id.value,
        actorUserId: 'other-vendor-staff',
        actorRoles: ['VENDOR_OWNER'],
      }),
    ).rejects.toBeInstanceOf(ReturnsAccessDeniedError);
  });
});
