import { describe, expect, it, vi } from 'vitest';
import { LedgerCommandHandler } from './ledger.handlers';

describe('LedgerCommandHandler', () => {
  it('records SALE + COMMISSION idempotently when order is PAID', async () => {
    const entries: { idempotencyKey: string; entryType: string; amountMinor: number }[] = [];
    const outbox: string[] = [];
    const balances = new Map<string, unknown>();

    const repo = {
      findEntryByIdempotencyKey: vi.fn(async (key: string) =>
        entries.find((e) => e.idempotencyKey === key) ? ({ idempotencyKey: key } as never) : null,
      ),
      appendEntry: vi.fn(
        async (entry: { idempotencyKey: string; entryType: string; amountMinor: number }) => {
          entries.push(entry);
        },
      ),
      appendOutbox: vi.fn(async (input: { eventType: string }) => {
        outbox.push(input.eventType);
      }),
      listEntriesByVendorId: vi.fn(async () => entries as never),
      saveBalance: vi.fn(async (snap: { vendorId: string }) => {
        balances.set(snap.vendorId, snap);
      }),
      findBalance: vi.fn(async (vendorId: string) => balances.get(vendorId) ?? null),
      withTransaction: vi.fn(async (work: (r: typeof repo) => Promise<unknown>) => work(repo)),
    };

    const orders = {
      getFinanceSnapshot: vi.fn(async () => ({
        orderId: 'ord-1',
        vendorId: 'vendor-1',
        storeId: 'store-1',
        paymentStatus: 'PAID',
        paymentMethod: 'COD',
        currencyCode: 'BDT',
        subtotalMinor: 1000,
        discountMinor: 0,
        commissionMinor: 100,
        totalMinor: 1100,
        commissionRateBps: 1000,
      })),
    };
    const config = { ledgerSettlementDays: 7 };
    const payouts = { listCompletedForVendor: vi.fn(async () => []) };
    const handler = new LedgerCommandHandler(
      repo as never,
      payouts as never,
      orders as never,
      config as never,
    );

    await handler.recordSaleRecognition({ orderId: 'ord-1', paymentIntentId: 'pi-1' });
    await handler.recordSaleRecognition({ orderId: 'ord-1', paymentIntentId: 'pi-1' });

    expect(entries.filter((e) => e.entryType === 'SALE')).toHaveLength(1);
    expect(entries.filter((e) => e.entryType === 'COMMISSION')).toHaveLength(1);
    expect(outbox).toEqual(['VendorSaleRecorded', 'CommissionRecorded']);
    expect(balances.get('vendor-1')).toMatchObject({
      pendingMinor: expect.any(Number),
    });
  });

  it('skips sale recognition when unpaid', async () => {
    const repo = {
      withTransaction: vi.fn(),
      listEntriesByVendorId: vi.fn(),
      saveBalance: vi.fn(),
    };
    const orders = {
      getFinanceSnapshot: vi.fn(async () => ({
        orderId: 'ord-1',
        vendorId: 'vendor-1',
        storeId: 'store-1',
        paymentStatus: 'PENDING',
        paymentMethod: 'COD',
        currencyCode: 'BDT',
        subtotalMinor: 1000,
        discountMinor: 0,
        commissionMinor: 100,
        totalMinor: 1100,
        commissionRateBps: 1000,
      })),
    };
    const handler = new LedgerCommandHandler(
      repo as never,
      { listCompletedForVendor: vi.fn(async () => []) } as never,
      orders as never,
      { ledgerSettlementDays: 7 } as never,
    );
    await handler.recordSaleRecognition({ orderId: 'ord-1' });
    expect(repo.withTransaction).not.toHaveBeenCalled();
  });

  it('records platform adjustment idempotently with audit metadata', async () => {
    const entries: {
      idempotencyKey: string;
      entryType: string;
      direction: string;
      amountMinor: number;
      metadata: Record<string, unknown> | null;
    }[] = [];
    const outbox: string[] = [];
    const repo = {
      findEntryByIdempotencyKey: vi.fn(async (key: string) =>
        entries.find((e) => e.idempotencyKey === key)
          ? ({
              ...entries.find((e) => e.idempotencyKey === key),
              id: 'adj-1',
              orderId: null,
              referenceType: 'ADJUSTMENT',
              referenceId: 'ref-1',
              currencyCode: 'BDT',
              availableAt: new Date(),
              occurredAt: new Date(),
            } as never)
          : null,
      ),
      appendEntry: vi.fn(async (entry: (typeof entries)[number]) => {
        entries.push(entry);
      }),
      appendOutbox: vi.fn(async (input: { eventType: string }) => {
        outbox.push(input.eventType);
      }),
      listEntriesByVendorId: vi.fn(async () => entries as never),
      saveBalance: vi.fn(),
      withTransaction: vi.fn(async (work: (r: typeof repo) => Promise<unknown>) => work(repo)),
    };
    const handler = new LedgerCommandHandler(
      repo as never,
      { listCompletedForVendor: vi.fn(async () => []) } as never,
      {} as never,
      { ledgerSettlementDays: 7 } as never,
    );

    await handler.recordAdjustment({
      vendorId: 'v1',
      storeId: 's1',
      direction: 'CREDIT',
      amountMinor: 50,
      currencyCode: 'BDT',
      reason: 'goodwill credit',
      actorUserId: 'admin-1',
      idempotencyKey: 'adj-key-01',
    });
    await handler.recordAdjustment({
      vendorId: 'v1',
      storeId: 's1',
      direction: 'CREDIT',
      amountMinor: 50,
      currencyCode: 'BDT',
      reason: 'goodwill credit',
      actorUserId: 'admin-1',
      idempotencyKey: 'adj-key-01',
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.metadata).toMatchObject({
      reason: 'goodwill credit',
      actorUserId: 'admin-1',
      audited: true,
    });
    expect(outbox).toEqual(['LedgerAdjustmentRecorded']);
  });

  it('posts REFUND debit plus proportional commission credit', async () => {
    const entries: {
      idempotencyKey: string;
      entryType: string;
      direction: string;
      amountMinor: number;
    }[] = [];
    const repo = {
      findEntryByIdempotencyKey: vi.fn(async (key: string) =>
        entries.find((e) => e.idempotencyKey === key) ? ({ idempotencyKey: key } as never) : null,
      ),
      appendEntry: vi.fn(
        async (entry: {
          idempotencyKey: string;
          entryType: string;
          direction: string;
          amountMinor: number;
        }) => {
          entries.push(entry);
        },
      ),
      appendOutbox: vi.fn(),
      listEntriesByVendorId: vi.fn(async () => entries as never),
      saveBalance: vi.fn(),
      withTransaction: vi.fn(async (work: (r: typeof repo) => Promise<unknown>) => work(repo)),
    };
    const handler = new LedgerCommandHandler(
      repo as never,
      {
        listCompletedForVendor: vi.fn(async () => []),
        sumReservedMinor: vi.fn(async () => 0),
      } as never,
      {} as never,
      { ledgerSettlementDays: 7 } as never,
    );

    await handler.recordRefundAllocation({
      entryType: 'REFUND',
      refundId: 'r1',
      paymentIntentId: 'pi1',
      orderId: 'o1',
      vendorId: 'v1',
      storeId: 's1',
      returnId: null,
      amountMinor: 500,
      currencyCode: 'BDT',
      method: 'MANUAL',
      referenceType: 'REFUND',
      referenceId: 'r1',
      idempotencyKey: 'ledger:refund:r1',
      commissionReversalMinor: 50,
    });

    expect(entries).toEqual([
      expect.objectContaining({ entryType: 'REFUND', direction: 'DEBIT', amountMinor: 500 }),
      expect.objectContaining({
        entryType: 'ADJUSTMENT',
        direction: 'CREDIT',
        amountMinor: 50,
        idempotencyKey: 'ledger:commission-reversal:r1',
      }),
    ]);
  });
});
