import { describe, expect, it, vi } from 'vitest';
import { routeQueueForEvent, QUEUE_NAMES } from '../domain/outbox.types';
import { isDuplicateJobIdError } from './outbox-dispatcher.service';
import { DomainEventsProcessor, parseRefundAllocation } from './processors/domain-events.processor';

describe('routeQueueForEvent', () => {
  it('routes COD/payment events to payment queue', () => {
    expect(routeQueueForEvent('CodPaymentCreated')).toBe(QUEUE_NAMES.payment);
    expect(routeQueueForEvent('CodCollected')).toBe(QUEUE_NAMES.payment);
    expect(routeQueueForEvent('RefundCompleted')).toBe(QUEUE_NAMES.payment);
    expect(routeQueueForEvent('VendorSaleRecorded')).toBe(QUEUE_NAMES.payout);
    expect(routeQueueForEvent('CommissionRecorded')).toBe(QUEUE_NAMES.payout);
    expect(routeQueueForEvent('PayoutRequested')).toBe(QUEUE_NAMES.payout);
    expect(routeQueueForEvent('PayoutCompleted')).toBe(QUEUE_NAMES.payout);
    expect(routeQueueForEvent('LedgerAdjustmentRecorded')).toBe(QUEUE_NAMES.payout);
  });

  it('routes shipment events to domain-events queue', () => {
    expect(routeQueueForEvent('ShipmentCreated')).toBe(QUEUE_NAMES.domainEvents);
  });
});

describe('isDuplicateJobIdError', () => {
  it('detects BullMQ duplicate jobId errors', () => {
    expect(
      isDuplicateJobIdError(new Error('Job aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa already exists')),
    ).toBe(true);
    expect(isDuplicateJobIdError(new Error('connection refused'))).toBe(false);
  });
});

describe('parseRefundAllocation', () => {
  it('reads allocation from RefundCompleted payload', () => {
    const allocation = parseRefundAllocation({
      allocation: {
        entryType: 'REFUND',
        refundId: 'r1',
        paymentIntentId: 'pi',
        orderId: 'o',
        vendorId: 'v',
        storeId: 's',
        returnId: null,
        amountMinor: 250,
        currencyCode: 'BDT',
        method: 'MANUAL',
        referenceType: 'REFUND',
        referenceId: 'r1',
        idempotencyKey: 'ledger:refund:r1',
        commissionReversalMinor: null,
      },
    });
    expect(allocation?.amountMinor).toBe(250);
    expect(allocation?.idempotencyKey).toBe('ledger:refund:r1');
  });
});

describe('DomainEventsProcessor', () => {
  it('processes once and skips duplicates via Redis NX', async () => {
    const redis = {
      set: vi.fn().mockResolvedValueOnce('OK').mockResolvedValueOnce(null),
    };
    const ledger = {
      recordRefundAllocation: vi.fn(),
      recordSaleRecognition: vi.fn(),
    };
    const processor = new DomainEventsProcessor(redis as never, ledger as never);
    const job = {
      outboxId: '11111111-1111-7111-8111-111111111111',
      source: 'payment' as const,
      aggregateId: '22222222-2222-7222-8222-222222222222',
      eventType: 'CodCollected',
      payload: { amountMinor: 100, orderId: 'ord-cod' },
      eventVersion: 1,
    };

    await processor.handle(job);
    await processor.handle(job);

    expect(redis.set).toHaveBeenCalledTimes(2);
    expect(ledger.recordRefundAllocation).not.toHaveBeenCalled();
  });

  it('posts RefundCompleted allocation to LedgerPort', async () => {
    const redis = { set: vi.fn().mockResolvedValue('OK') };
    const ledger = {
      recordRefundAllocation: vi.fn().mockResolvedValue(undefined),
      recordSaleRecognition: vi.fn().mockResolvedValue(undefined),
    };
    const processor = new DomainEventsProcessor(redis as never, ledger as never);

    await processor.handle({
      outboxId: '33333333-3333-7333-8333-333333333333',
      source: 'payment',
      aggregateId: 'refund-1',
      eventType: 'RefundCompleted',
      payload: {
        allocation: {
          entryType: 'REFUND',
          refundId: 'refund-1',
          paymentIntentId: 'pi-1',
          orderId: 'ord-1',
          vendorId: 'vendor-1',
          storeId: 'store-1',
          returnId: null,
          amountMinor: 900,
          currencyCode: 'BDT',
          method: 'MANUAL',
          referenceType: 'REFUND',
          referenceId: 'refund-1',
          idempotencyKey: 'ledger:refund:refund-1',
          commissionReversalMinor: null,
        },
      },
      eventVersion: 1,
    });

    expect(ledger.recordRefundAllocation).toHaveBeenCalledWith(
      expect.objectContaining({
        refundId: 'refund-1',
        amountMinor: 900,
        idempotencyKey: 'ledger:refund:refund-1',
      }),
    );
  });

  it('recognizes sale on CodCollected', async () => {
    const redis = { set: vi.fn().mockResolvedValue('OK') };
    const ledger = {
      recordRefundAllocation: vi.fn(),
      recordSaleRecognition: vi.fn().mockResolvedValue(undefined),
    };
    const processor = new DomainEventsProcessor(redis as never, ledger as never);
    await processor.handle({
      outboxId: '44444444-4444-7444-8444-444444444444',
      source: 'payment',
      aggregateId: 'pi-1',
      eventType: 'CodCollected',
      payload: { orderId: 'ord-9', paymentIntentId: 'pi-1' },
      eventVersion: 1,
    });
    expect(ledger.recordSaleRecognition).toHaveBeenCalledWith({
      orderId: 'ord-9',
      paymentIntentId: 'pi-1',
    });
  });
});
