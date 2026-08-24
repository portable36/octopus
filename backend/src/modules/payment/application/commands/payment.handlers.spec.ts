import { describe, expect, it, vi } from 'vitest';
import {
  CancelCodPaymentHandler,
  CollectCodPaymentHandler,
  CreatePaymentIntentHandler,
} from './payment.handlers';
import { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import { CodAmountMismatchError } from '../../domain/errors/payment.errors';
import {
  PaymentAccessDeniedError,
  PaymentIdempotencyConflictError,
} from '../errors/payment.errors';

function makeCodIntent(orderId = 'ord-a') {
  return PaymentIntent.create({
    checkoutId: 'chk-1',
    orderId,
    vendorId: 'vendor-1',
    storeId: 'store-1',
    customerId: 'cust-1',
    paymentMethod: 'COD',
    amountMinor: 1500,
    currencyCode: 'BDT',
  });
}

describe('Payment handlers', () => {
  it('createIntent is idempotent and method-aware', async () => {
    const saved: PaymentIntent[] = [];
    const ops = new Map<string, { requestHash: string; responseJson: Record<string, unknown> }>();
    const repo = {
      findOperation: vi.fn(async (key: string) => ops.get(key) ?? null),
      findIntentByOrderId: vi.fn(async () => null),
      saveIntent: vi.fn(async (intent: PaymentIntent) => {
        saved.push(intent);
      }),
      saveOperation: vi.fn(
        async (input: {
          idempotencyKey: string;
          requestHash: string;
          responseJson: Record<string, unknown>;
        }) => {
          ops.set(input.idempotencyKey, {
            requestHash: input.requestHash,
            responseJson: input.responseJson,
          });
        },
      ),
    };
    const handler = new CreatePaymentIntentHandler(repo as never);
    const first = await handler.execute({
      checkoutId: 'chk-1',
      orderId: 'ord-1',
      vendorId: 'v-1',
      storeId: 's-1',
      idempotencyKey: 'create-1',
      customerId: null,
      currencyCode: 'BDT',
      amountMinor: 1000,
      paymentMethod: 'COD',
    });
    expect(first.status).toBe('AWAITING_COLLECTION');
    expect(first.clientSecret).toBeUndefined();

    const second = await handler.execute({
      checkoutId: 'chk-1',
      orderId: 'ord-1',
      vendorId: 'v-1',
      storeId: 's-1',
      idempotencyKey: 'create-1',
      customerId: null,
      currencyCode: 'BDT',
      amountMinor: 1000,
      paymentMethod: 'COD',
    });
    expect(second.paymentIntentId).toBe(first.paymentIntentId);
    expect(repo.saveIntent).toHaveBeenCalledTimes(1);

    await expect(
      handler.execute({
        checkoutId: 'chk-1',
        orderId: 'ord-2',
        vendorId: 'v-1',
        storeId: 's-1',
        idempotencyKey: 'create-1',
        customerId: null,
        currencyCode: 'BDT',
        amountMinor: 2000,
        paymentMethod: 'COD',
      }),
    ).rejects.toBeInstanceOf(PaymentIdempotencyConflictError);

    const gateway = await handler.execute({
      checkoutId: 'chk-1',
      orderId: 'ord-gw',
      vendorId: 'v-1',
      storeId: 's-1',
      idempotencyKey: 'create-gw',
      customerId: null,
      currencyCode: 'BDT',
      amountMinor: 1000,
      paymentMethod: 'NAGAD',
    });
    expect(gateway.status).toBe('REQUIRES_PAYMENT');
    expect(gateway.clientSecret).toBeTruthy();
  });

  it('collect success, amount mismatch, authz, and multi-store isolation', async () => {
    const intentA = makeCodIntent('ord-a');
    const intentB = makeCodIntent('ord-b');
    // force distinct store for B
    const intents = new Map([
      [intentA.id.value, intentA],
      [intentB.id.value, intentB],
    ]);
    const collections = new Map<string, Record<string, unknown>>();
    const ops = new Map<string, { requestHash: string; responseJson: Record<string, unknown> }>();

    const repo = {
      findOperation: vi.fn(async (key: string) => ops.get(key) ?? null),
      findCodCollectionByIdempotencyKey: vi.fn(async (key: string) => collections.get(key) ?? null),
      findIntentById: vi.fn(async (id: string) => intents.get(id) ?? null),
      saveIntent: vi.fn(async (intent: PaymentIntent) => {
        intents.set(intent.id.value, intent);
      }),
      saveCodCollection: vi.fn(async (record: { idempotencyKey: string }) => {
        const saved = { id: `col-${record.idempotencyKey}`, ...record, collectedAt: new Date() };
        collections.set(record.idempotencyKey, saved);
        return saved;
      }),
      saveOperation: vi.fn(
        async (input: {
          idempotencyKey: string;
          requestHash: string;
          responseJson: Record<string, unknown>;
        }) => {
          ops.set(input.idempotencyKey, {
            requestHash: input.requestHash,
            responseJson: input.responseJson,
          });
        },
      ),
      withTransaction: vi.fn(async (work: (r: typeof repo) => Promise<unknown>) => work(repo)),
      appendOutbox: vi.fn(),
    };

    const authz = {
      requireCodCollector: vi.fn(async () => undefined),
    };
    const orders = {
      markPaidFromPayment: vi.fn(async () => undefined),
    };

    const collect = new CollectCodPaymentHandler(repo as never, authz as never, orders as never);

    const ok = await collect.execute({
      paymentIntentId: intentA.id.value,
      amountMinor: 1500,
      currencyCode: 'BDT',
      idempotencyKey: 'collect-a',
      actorUserId: 'mgr-1',
      actorRoles: ['STORE_MANAGER'],
    });
    expect(ok.status).toBe('COLLECTED');
    expect(orders.markPaidFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'ord-a' }),
    );
    expect(intentB.status).toBe('AWAITING_COLLECTION');

    const again = await collect.execute({
      paymentIntentId: intentA.id.value,
      amountMinor: 1500,
      currencyCode: 'BDT',
      idempotencyKey: 'collect-a',
      actorUserId: 'mgr-1',
      actorRoles: ['STORE_MANAGER'],
    });
    expect(again.collectionId).toBe(ok.collectionId);
    expect(orders.markPaidFromPayment).toHaveBeenCalledTimes(1);

    await expect(
      collect.execute({
        paymentIntentId: intentB.id.value,
        amountMinor: 999,
        currencyCode: 'BDT',
        idempotencyKey: 'collect-mismatch',
        actorUserId: 'mgr-1',
        actorRoles: ['STORE_MANAGER'],
      }),
    ).rejects.toBeInstanceOf(CodAmountMismatchError);

    authz.requireCodCollector.mockRejectedValueOnce(new PaymentAccessDeniedError());
    await expect(
      collect.execute({
        paymentIntentId: intentB.id.value,
        amountMinor: 1500,
        currencyCode: 'BDT',
        idempotencyKey: 'collect-forbidden',
        actorUserId: 'stranger',
        actorRoles: ['STORE_STAFF'],
      }),
    ).rejects.toBeInstanceOf(PaymentAccessDeniedError);
  });

  it('cancel does not mark paid', async () => {
    const intent = makeCodIntent();
    const ops = new Map<string, { requestHash: string; responseJson: Record<string, unknown> }>();
    const repo = {
      findOperation: vi.fn(async (key: string) => ops.get(key) ?? null),
      findIntentById: vi.fn(async () => intent),
      saveIntent: vi.fn(async () => undefined),
      saveOperation: vi.fn(
        async (input: {
          idempotencyKey: string;
          requestHash: string;
          responseJson: Record<string, unknown>;
        }) => {
          ops.set(input.idempotencyKey, {
            requestHash: input.requestHash,
            responseJson: input.responseJson,
          });
        },
      ),
    };
    const authz = { requireCodCollector: vi.fn(async () => undefined) };
    const cancel = new CancelCodPaymentHandler(repo as never, authz as never);
    await cancel.execute({
      paymentIntentId: intent.id.value,
      actorUserId: 'mgr-1',
      actorRoles: ['STORE_MANAGER'],
      idempotencyKey: 'cancel-1',
    });
    expect(intent.status).toBe('CANCELLED');
  });
});
