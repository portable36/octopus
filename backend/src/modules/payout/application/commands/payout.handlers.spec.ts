import { describe, expect, it, vi } from 'vitest';
import { InsufficientPayoutBalanceError } from '../../domain/errors/payout.errors';
import { VendorPayout } from '../../domain/aggregates/vendor-payout.aggregate';
import { PayoutCommandHandler } from './payout.handlers';

function makePayout(overrides?: Partial<{ amountMinor: number; status: string }>) {
  const payout = VendorPayout.create({
    vendorId: 'v1',
    storeId: 's1',
    amountMinor: overrides?.amountMinor ?? 400,
    currencyCode: 'BDT',
    idempotencyKey: `idem-${Math.random().toString(36).slice(2)}`,
    requestedByUserId: 'u1',
  });
  return payout;
}

describe('PayoutCommandHandler', () => {
  it('rejects request when amount exceeds available − reserved', async () => {
    const payouts = {
      findByIdempotencyKey: vi.fn(async () => null),
      findById: vi.fn(),
      withTransaction: vi.fn(async (work: (r: typeof payouts) => Promise<unknown>) =>
        work(payouts),
      ),
      lockVendorBalance: vi.fn(async () => undefined),
      computeAvailableMinor: vi.fn(async () => 500),
      sumReservedMinor: vi.fn(async () => 200),
      save: vi.fn(),
      appendOutbox: vi.fn(),
    };
    const authz = {
      requireRequester: vi.fn(async () => ({ currencyCode: 'BDT' })),
    };
    const handler = new PayoutCommandHandler(
      payouts as never,
      { disburse: vi.fn() } as never,
      {} as never,
      authz as never,
    );

    await expect(
      handler.requestPayout({
        vendorId: 'v1',
        storeId: 's1',
        amountMinor: 400,
        actorUserId: 'u1',
        actorRoles: ['VENDOR_OWNER'],
        idempotencyKey: 'idem-key-01',
      }),
    ).rejects.toBeInstanceOf(InsufficientPayoutBalanceError);
    expect(payouts.save).not.toHaveBeenCalled();
  });

  it('processes approved payout to COMPLETED with single ledger debit', async () => {
    const payout = makePayout({ amountMinor: 300 });
    payout.approve();

    const store = { current: payout };
    const payouts = {
      findById: vi.fn(async () => store.current),
      save: vi.fn(async (p: VendorPayout) => {
        store.current = p;
      }),
      appendOutbox: vi.fn(),
    };
    const ledger = {
      recordPayoutDebit: vi.fn(async () => 'ledger-entry-1'),
    };
    const provider = {
      disburse: vi.fn(async () => ({ ok: true as const, providerRef: 'stub:1' })),
    };
    const authz = {
      requireProcessor: vi.fn(),
    };
    const handler = new PayoutCommandHandler(
      payouts as never,
      provider as never,
      ledger as never,
      authz as never,
    );

    const result = await handler.processPayout({
      payoutId: payout.id.value,
      actorUserId: 'u-admin',
      actorRoles: ['PLATFORM_ADMIN'],
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.ledgerEntryId).toBe('ledger-entry-1');
    expect(ledger.recordPayoutDebit).toHaveBeenCalledTimes(1);
    expect(provider.disburse).toHaveBeenCalledTimes(1);
  });

  it('releases reservation on provider failure without ledger debit', async () => {
    const payout = makePayout({ amountMinor: 300 });
    payout.approve();
    const store = { current: payout };
    const payouts = {
      findById: vi.fn(async () => store.current),
      save: vi.fn(async (p: VendorPayout) => {
        store.current = p;
      }),
      appendOutbox: vi.fn(),
    };
    const ledger = { recordPayoutDebit: vi.fn() };
    const provider = {
      disburse: vi.fn(async () => ({ ok: false as const, reason: 'network' })),
    };
    const handler = new PayoutCommandHandler(
      payouts as never,
      provider as never,
      ledger as never,
      { requireProcessor: vi.fn() } as never,
    );

    const result = await handler.processPayout({
      payoutId: payout.id.value,
      actorUserId: 'u-admin',
      actorRoles: ['PLATFORM_ADMIN'],
    });

    expect(result.status).toBe('FAILED');
    expect(ledger.recordPayoutDebit).not.toHaveBeenCalled();
  });
});
