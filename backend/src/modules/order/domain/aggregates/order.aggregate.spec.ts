import { describe, expect, it } from 'vitest';
import { Order } from './order.aggregate';
import { InvalidOrderFulfillmentError, InvalidOrderTransitionError } from '../errors/order.errors';

function createPendingOrder() {
  return Order.createFromCheckout({
    checkoutId: 'chk-1',
    idempotencyKey: 'idem-order-1',
    customerId: 'cust-1',
    vendorId: 'vendor-1',
    storeId: 'store-1',
    currencyCode: 'BDT',
    subtotalMinor: 1500,
    discountMinor: 0,
    shippingMinor: 50,
    taxMinor: 0,
    commissionMinor: 100,
    totalMinor: 1550,
    shippingMethod: 'STANDARD',
    shippingAddress: { line1: '12 Road', city: 'Dhaka', countryCode: 'BD' },
    appliedPromotionId: null,
    appliedCouponCode: null,
    paymentMethod: 'SSLCOMMERZ',
    pricingSnapshot: {
      taxRateBps: 0,
      commissionRateBps: 1000,
      evaluatedAt: new Date().toISOString(),
    },
    lines: [
      {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        offerId: 'o1',
        quantity: 2,
        unitPriceMinor: 500,
        lineSubtotalMinor: 1000,
        lineDiscountMinor: 0,
        lineTaxMinor: 0,
        lineTotalMinor: 1000,
        currencyCode: 'BDT',
        reservationId: 'r1',
        warehouseId: 'w1',
      },
      {
        lineId: 'l2',
        productId: 'p2',
        variantId: 'v2',
        offerId: 'o2',
        quantity: 1,
        unitPriceMinor: 500,
        lineSubtotalMinor: 500,
        lineDiscountMinor: 0,
        lineTaxMinor: 0,
        lineTotalMinor: 500,
        currencyCode: 'BDT',
        reservationId: 'r2',
        warehouseId: 'w1',
      },
    ],
  });
}

describe('Order state machine', () => {
  it('allows happy path and rejects invalid transitions', () => {
    const order = createPendingOrder();
    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.paymentStatus).toBe('PENDING');
    expect(order.orderNumber.startsWith('ORD-')).toBe(true);

    expect(() => order.startProcessing()).toThrow(InvalidOrderTransitionError);
    order.markPaid();
    expect(order.status).toBe('PAID');
    expect(order.paymentStatus).toBe('PAID');

    order.startProcessing();
    order.fulfillLine('l1', 2);
    expect(order.status).toBe('PARTIALLY_FULFILLED');
    expect(order.fulfillmentStatus).toBe('PARTIALLY_FULFILLED');

    order.fulfillLine('l2', 1);
    expect(order.status).toBe('FULFILLED');
    order.complete();
    expect(order.status).toBe('COMPLETED');
    expect(() => order.cancel()).toThrow(InvalidOrderTransitionError);
  });

  it('supports cancellation, refund, return, and payment failure paths', () => {
    const cancelable = createPendingOrder();
    cancelable.markPaid();
    cancelable.cancel();
    expect(cancelable.status).toBe('CANCELLED');

    const refundable = createPendingOrder();
    refundable.markPaid();
    refundable.requestRefund();
    expect(refundable.status).toBe('REFUND_REQUESTED');
    expect(refundable.paymentStatus).toBe('REFUND_REQUESTED');

    const returnable = createPendingOrder();
    returnable.markPaid();
    returnable.startProcessing();
    returnable.fulfillLine('l1', 2);
    returnable.fulfillLine('l2', 1);
    returnable.requestReturn();
    expect(returnable.status).toBe('RETURN_REQUESTED');
    returnable.markReturned();
    expect(returnable.status).toBe('RETURNED');

    const failed = createPendingOrder();
    failed.markPaymentFailed();
    expect(failed.status).toBe('PAYMENT_FAILED');
    expect(failed.paymentStatus).toBe('FAILED');
  });

  it('rejects over-fulfillment', () => {
    const order = createPendingOrder();
    order.markPaid();
    order.startProcessing();
    expect(() => order.fulfillLine('l1', 3)).toThrow(InvalidOrderFulfillmentError);
  });

  it('can fulfill fully in one step from PROCESSING', () => {
    const order = createPendingOrder();
    order.markPaid();
    order.startProcessing();
    order.fulfillLine('l1', 2);
    order.fulfillLine('l2', 1);
    expect(order.status).toBe('FULFILLED');
    expect(order.fulfillmentStatus).toBe('FULFILLED');
  });

  it('allows COD unpaid processing then markPaid without reverting status', () => {
    const order = Order.createFromCheckout({
      checkoutId: 'chk-1',
      idempotencyKey: 'idem-cod',
      customerId: 'cust-1',
      vendorId: 'vendor-1',
      storeId: 'store-1',
      paymentMethod: 'COD',
      currencyCode: 'BDT',
      subtotalMinor: 1000,
      discountMinor: 0,
      shippingMinor: 0,
      taxMinor: 0,
      commissionMinor: 0,
      totalMinor: 1000,
      shippingMethod: 'STANDARD',
      shippingAddress: { line1: '12 Road', city: 'Dhaka', countryCode: 'BD' },
      appliedPromotionId: null,
      appliedCouponCode: null,
      pricingSnapshot: {
        taxRateBps: 0,
        commissionRateBps: 0,
        evaluatedAt: new Date().toISOString(),
      },
      lines: [
        {
          lineId: 'l1',
          productId: 'p1',
          variantId: 'v1',
          offerId: 'o1',
          quantity: 1,
          unitPriceMinor: 1000,
          lineSubtotalMinor: 1000,
          lineDiscountMinor: 0,
          lineTaxMinor: 0,
          lineTotalMinor: 1000,
          currencyCode: 'BDT',
          reservationId: 'r1',
          warehouseId: 'w1',
        },
      ],
    });

    order.startProcessing();
    expect(order.status).toBe('PROCESSING');
    expect(order.paymentStatus).toBe('PENDING');
    order.markPaid();
    expect(order.status).toBe('PROCESSING');
    expect(order.paymentStatus).toBe('PAID');
  });
});
