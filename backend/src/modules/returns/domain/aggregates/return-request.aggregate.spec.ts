import { describe, expect, it } from 'vitest';
import { ReturnRequest } from './return-request.aggregate';
import { InvalidReturnInspectionError } from '../errors/returns.errors';

function seedReturn(): ReturnRequest {
  return ReturnRequest.create({
    orderId: '11111111-1111-7111-8111-111111111111',
    customerId: '22222222-2222-7222-8222-222222222222',
    vendorId: '33333333-3333-7333-8333-333333333333',
    storeId: '44444444-4444-7444-8444-444444444444',
    items: [
      {
        orderItemId: 'line-1',
        productId: 'p1',
        variantId: 'v1',
        warehouseId: 'w1',
        sku: 'SKU-1',
        productName: 'Tee',
        unitPriceMinor: 1200,
        lineDiscountMinor: 0,
        lineTaxMinor: 0,
        lineTotalMinor: 1200,
        quantity: 2,
        reasonCode: 'DAMAGED',
      },
    ],
  });
}

describe('ReturnRequest', () => {
  it('approves into AWAITING_RETURN without refunding', () => {
    const ret = seedReturn();
    ret.approve();
    expect(ret.status).toBe('AWAITING_RETURN');
    expect(ret.getUncommittedEvents().some((e) => e.eventName === 'ReturnApproved')).toBe(true);
  });

  it('rejects with reason', () => {
    const ret = seedReturn();
    ret.startReview();
    ret.reject({ reasonCode: 'RETURN_POLICY_VIOLATION', note: 'too late' });
    expect(ret.status).toBe('REJECTED');
    expect(ret.rejectionReasonCode).toBe('RETURN_POLICY_VIOLATION');
  });

  it('validates partial inspection quantities', () => {
    const ret = seedReturn();
    ret.approve();
    ret.markReceived();
    ret.startInspection();
    expect(() =>
      ret.completeInspection({
        quantityReceived: 2,
        quantityAccepted: 2,
        quantityRejected: 1,
        condition: 'USED',
        inspectedBy: 'staff-1',
      }),
    ).toThrow(InvalidReturnInspectionError);

    ret.completeInspection({
      quantityReceived: 2,
      quantityAccepted: 1,
      quantityRejected: 1,
      condition: 'DAMAGED',
      inspectedBy: 'staff-1',
    });
    expect(ret.status).toBe('INSPECTION_APPROVED');
  });

  it('cannot cancel after inspection', () => {
    const ret = seedReturn();
    ret.approve();
    ret.markReceived();
    ret.startInspection();
    ret.completeInspection({
      quantityReceived: 2,
      quantityAccepted: 2,
      quantityRejected: 0,
      condition: 'LIKE_NEW',
      inspectedBy: 'staff-1',
    });
    expect(() => ret.cancel()).toThrow(/CANCELLED/);
  });
});
