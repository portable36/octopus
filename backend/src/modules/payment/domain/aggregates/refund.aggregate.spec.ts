import { describe, expect, it } from 'vitest';
import { InvalidPaymentMoneyError, RefundExceedsAvailableError } from '../errors/payment.errors';
import { Refund } from './refund.aggregate';

describe('Refund aggregate', () => {
  it('creates PENDING and completes with evidence', () => {
    const refund = Refund.create({
      paymentIntentId: 'pi-1',
      orderId: 'ord-1',
      vendorId: 'v-1',
      storeId: 's-1',
      amountMinor: 500,
      currencyCode: 'bdt',
      method: 'MANUAL',
      availableMinor: 1500,
      reason: 'inspection approved',
    });
    expect(refund.status).toBe('PENDING');
    expect(refund.currencyCode).toBe('BDT');

    refund.markSucceeded({
      providerRefundId: 'manual:local',
      providerResponseCode: 'MANUAL_OK',
      providerReceivedAt: new Date('2026-08-25T12:00:00.000Z'),
      orderCommissionMinor: 100,
      orderTotalMinor: 1500,
    });
    expect(refund.status).toBe('SUCCEEDED');
    expect(refund.getUncommittedEvents().some((e) => e.eventName === 'RefundCompleted')).toBe(true);
    const completed = refund.getUncommittedEvents().find((e) => e.eventName === 'RefundCompleted');
    expect(completed?.payload['allocation']).toMatchObject({
      entryType: 'REFUND',
      amountMinor: 500,
      commissionReversalMinor: 33, // floor(100 * 500 / 1500)
    });
  });

  it('rejects over-refund at create', () => {
    expect(() =>
      Refund.create({
        paymentIntentId: 'pi-1',
        orderId: 'ord-1',
        vendorId: 'v-1',
        storeId: 's-1',
        amountMinor: 1600,
        currencyCode: 'BDT',
        method: 'MANUAL',
        availableMinor: 1500,
      }),
    ).toThrow(RefundExceedsAvailableError);
  });

  it('rejects non-positive amounts', () => {
    expect(() =>
      Refund.create({
        paymentIntentId: 'pi-1',
        orderId: 'ord-1',
        vendorId: 'v-1',
        storeId: 's-1',
        amountMinor: 0,
        currencyCode: 'BDT',
        method: 'MANUAL',
        availableMinor: 1500,
      }),
    ).toThrow(InvalidPaymentMoneyError);
  });
});
