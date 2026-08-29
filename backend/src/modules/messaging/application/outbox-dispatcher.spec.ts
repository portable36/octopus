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
    expect(routeQueueForEvent('StoreOfferActivated')).toBe(QUEUE_NAMES.searchIndexing);
    expect(routeQueueForEvent('ProductStatusChanged')).toBe(QUEUE_NAMES.searchIndexing);
    expect(routeQueueForEvent('InventoryAdjusted')).toBe(QUEUE_NAMES.searchIndexing);
    expect(routeQueueForEvent('SearchReindexBatch')).toBe(QUEUE_NAMES.searchIndexing);
    expect(routeQueueForEvent('NotificationDeliver')).toBe(QUEUE_NAMES.notification);
  });

  it('routes shipment events to domain-events queue', () => {
    expect(routeQueueForEvent('ShipmentCreated')).toBe(QUEUE_NAMES.domainEvents);
  });

  it('routes OrderPaid to marketing queue', () => {
    expect(routeQueueForEvent('OrderPaid')).toBe(QUEUE_NAMES.marketing);
    expect(routeQueueForEvent('OrderCreated')).toBe(QUEUE_NAMES.marketing);
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
  const notifications = { handle: vi.fn().mockResolvedValue(undefined) };
  const marketing = { handle: vi.fn().mockResolvedValue(undefined) };

  it('processes once and skips duplicates via Redis NX', async () => {
    const redis = {
      get: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('1'),
      set: vi.fn().mockResolvedValue('OK'),
    };
    const ledger = {
      recordRefundAllocation: vi.fn(),
      recordSaleRecognition: vi.fn(),
    };
    const processor = new DomainEventsProcessor(
      redis as never,
      ledger as never,
      notifications as never,
      marketing as never,
    );
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

    expect(redis.set).toHaveBeenCalledTimes(1);
    expect(ledger.recordRefundAllocation).not.toHaveBeenCalled();
  });

  it('does not permanently deduplicate a failed delivery', async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
    };
    const ledger = {
      recordRefundAllocation: vi
        .fn()
        .mockRejectedValueOnce(new Error('temporary ledger outage'))
        .mockResolvedValue(undefined),
      recordSaleRecognition: vi.fn(),
    };
    const processor = new DomainEventsProcessor(
      redis as never,
      ledger as never,
      notifications as never,
      marketing as never,
    );
    const job = {
      outboxId: '55555555-5555-7555-8555-555555555555',
      source: 'payment' as const,
      aggregateId: 'refund-2',
      eventType: 'RefundCompleted',
      payload: {
        allocation: {
          refundId: 'refund-2',
          paymentIntentId: 'pi-2',
          orderId: 'ord-2',
          vendorId: 'vendor-2',
          storeId: 'store-2',
          amountMinor: 100,
          currencyCode: 'BDT',
          method: 'MANUAL',
        },
      },
      eventVersion: 1,
    };

    await expect(processor.handle(job)).rejects.toThrow('temporary ledger outage');
    await expect(processor.handle(job)).resolves.toBeUndefined();

    expect(ledger.recordRefundAllocation).toHaveBeenCalledTimes(2);
    expect(redis.set).toHaveBeenNthCalledWith(
      1,
      `outbox:processed:${job.outboxId}`,
      '1',
      'EX',
      60 * 60 * 24 * 14,
      'NX',
    );
  });

  it('posts RefundCompleted allocation to LedgerPort', async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
    };
    const ledger = {
      recordRefundAllocation: vi.fn().mockResolvedValue(undefined),
      recordSaleRecognition: vi.fn().mockResolvedValue(undefined),
    };
    const processor = new DomainEventsProcessor(
      redis as never,
      ledger as never,
      notifications as never,
      marketing as never,
    );

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
    expect(notifications.handle).toHaveBeenCalled();
    expect(marketing.handle).toHaveBeenCalled();
  });

  it('recognizes sale on CodCollected', async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
    };
    const ledger = {
      recordRefundAllocation: vi.fn(),
      recordSaleRecognition: vi.fn().mockResolvedValue(undefined),
    };
    const processor = new DomainEventsProcessor(
      redis as never,
      ledger as never,
      notifications as never,
      marketing as never,
    );
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
    expect(marketing.handle).toHaveBeenCalledWith(
      'CodCollected',
      expect.objectContaining({ orderId: 'ord-9' }),
    );
  });
});
