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
    const orderSnapshot = {
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
      shippingAddress: { line1: '12 Road', city: 'Dhaka', countryCode: 'BD' },
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
    };
    const orders = {
      getReturnSnapshot: vi.fn().mockResolvedValue(orderSnapshot),
      getReturnSnapshotByOrderNumber: vi.fn().mockResolvedValue(orderSnapshot),
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
    const userContact = {
      findEmailByUserId: vi.fn().mockResolvedValue('customer@example.com'),
      findUserIdByEmail: vi.fn().mockResolvedValue(customerId),
    };
    const handlers = new ReturnsHandlers(
      returns as never,
      orders as never,
      inventory as never,
      authz as never,
      userContact as never,
    );
    return { handlers, returns, orders, authz, inventory, userContact, orderSnapshot };
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

  it('performs public lookup for an order and returns eligibility & lines', async () => {
    const { handlers } = build();
    const result = await handlers.publicLookup({
      orderNumber: 'ORD-1',
      email: 'customer@example.com',
    });

    expect(result.orderNumber).toBe('ORD-1');
    expect(result.returnEligible).toBe(true);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.returnableQuantity).toBe(5);
    expect(result.returnWindowDays).toBe(7);
  });

  it('submits a public self-service return request and supports idempotency', async () => {
    const { handlers, returns } = build();
    const ret = await handlers.publicRequestReturn({
      orderNumber: 'ORD-1',
      email: 'customer@example.com',
      idempotencyKey: 'public-return-001',
      items: [{ orderItemId: lineId, quantity: 2, reasonCode: 'DEFECTIVE' }],
    });

    expect(ret.status).toBe('REQUESTED');
    expect(returns.save).toHaveBeenCalled();
    expect(returns.saveOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'public-return-001',
        operationType: 'public_request_return',
      }),
    );
  });

  it('retrieves public return tracking timeline with milestones', async () => {
    const { handlers, returns } = build();
    const ret = await handlers.publicRequestReturn({
      orderNumber: 'ORD-1',
      email: 'customer@example.com',
      idempotencyKey: 'public-return-002',
      items: [{ orderItemId: lineId, quantity: 1, reasonCode: 'SIZE_ISSUE' }],
    });
    returns.findById.mockResolvedValue(ret);

    const timeline = await handlers.publicGetReturnTimeline({
      returnId: ret.id.value,
      email: 'customer@example.com',
    });

    expect(timeline.id).toBe(ret.id.value);
    expect(timeline.orderNumber).toBe('ORD-1');
    expect(timeline.status).toBe('REQUESTED');
    expect(timeline.milestones).toHaveLength(6);
    expect(timeline.milestones[0]?.key).toBe('REQUESTED');
    expect(timeline.milestones[0]?.state).toBe('COMPLETED');
    expect(timeline.canCancel).toBe(true);
  });

  it('cancels customer return request before warehouse intake', async () => {
    const { handlers, returns } = build();
    const ret = await handlers.publicRequestReturn({
      orderNumber: 'ORD-1',
      email: 'customer@example.com',
      idempotencyKey: 'public-return-003',
      items: [{ orderItemId: lineId, quantity: 1, reasonCode: 'CUSTOMER_CHANGED_MIND' }],
    });
    returns.findById.mockResolvedValue(ret);

    const cancelled = await handlers.publicCancelReturn({
      returnId: ret.id.value,
      email: 'customer@example.com',
    });

    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.statusLabel).toBe('Return Cancelled');
  });

  it('lists store returns for staff-scoped actors', async () => {
    const { handlers, returns, authz } = build();
    const existing = await handlers.requestReturn({
      orderId,
      actorUserId: customerId,
      actorRoles: ['CUSTOMER'],
      idempotencyKey: 'idem-return-store-list',
      items: [{ orderItemId: lineId, quantity: 1, reasonCode: 'DAMAGED' }],
    });
    returns.listByStoreId.mockResolvedValue([existing]);

    const list = await handlers.listByStore({
      storeId: 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeeee',
      vendorId: 'dddddddd-dddd-7ddd-8ddd-dddddddddddd',
      actorUserId: 'vendor-owner-1',
      actorRoles: ['VENDOR_OWNER'],
    });

    expect(list).toHaveLength(1);
    expect(authz.requireStaffScope).toHaveBeenCalled();
  });
});
