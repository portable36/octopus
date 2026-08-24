import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ORDER_PORT, type OrderPort } from '../../../../shared-kernel/application/ports/order.port';
import type {
  CancelPaymentIntentInput,
  ConfirmCodCollectionInput,
  ConfirmCodCollectionResult,
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
} from '../../../../shared-kernel/application/ports/payment.port';
import { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import {
  CodAmountMismatchError,
  CodAlreadyCollectedError,
} from '../../domain/errors/payment.errors';
import { PaymentIdempotencyConflictError, PaymentNotFoundError } from '../errors/payment.errors';
import { PAYMENT_REPOSITORY, type PaymentRepository } from '../ports/payment-repository.interface';
import { PaymentAuthorizationService } from '../services/payment-authorization.service';

@Injectable()
export class CreatePaymentIntentHandler {
  constructor(@Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository) {}

  public async execute(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const requestHash = hashCreateIntent(input);
    const prior = await this.payments.findOperation(input.idempotencyKey);
    if (prior) {
      if (prior.requestHash !== requestHash) {
        throw new PaymentIdempotencyConflictError();
      }
      return prior.responseJson as unknown as CreatePaymentIntentResult;
    }

    const existingForOrder = await this.payments.findIntentByOrderId(input.orderId);
    if (existingForOrder) {
      return toCreateResult(existingForOrder);
    }

    const intent = PaymentIntent.create({
      checkoutId: input.checkoutId,
      orderId: input.orderId,
      vendorId: input.vendorId,
      storeId: input.storeId,
      customerId: input.customerId,
      paymentMethod: input.paymentMethod,
      amountMinor: input.amountMinor,
      currencyCode: input.currencyCode,
      expiresAt: input.expiresAt ?? null,
    });

    const result = toCreateResult(intent);
    await this.payments.saveIntent(intent);
    await this.payments.saveOperation({
      idempotencyKey: input.idempotencyKey,
      operationType: 'CREATE_INTENT',
      requestHash,
      responseJson: result as unknown as Record<string, unknown>,
    });
    return result;
  }
}

@Injectable()
export class CollectCodPaymentHandler {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    private readonly authz: PaymentAuthorizationService,
    @Inject(ORDER_PORT) private readonly orders: OrderPort,
  ) {}

  public async execute(input: ConfirmCodCollectionInput): Promise<ConfirmCodCollectionResult> {
    return this.collect(input, false);
  }

  public async executeTrusted(
    input: Omit<ConfirmCodCollectionInput, 'actorRoles'> & {
      readonly actorRoles?: readonly string[];
    },
  ): Promise<ConfirmCodCollectionResult> {
    return this.collect(
      {
        ...input,
        actorRoles: input.actorRoles ?? ['PLATFORM_ADMIN'],
      },
      true,
    );
  }

  private async collect(
    input: ConfirmCodCollectionInput,
    skipStaffAuthz: boolean,
  ): Promise<ConfirmCodCollectionResult> {
    const requestHash = hashCollect(input);
    const priorOp = await this.payments.findOperation(input.idempotencyKey);
    if (priorOp) {
      if (priorOp.requestHash !== requestHash) {
        throw new PaymentIdempotencyConflictError();
      }
      return priorOp.responseJson as unknown as ConfirmCodCollectionResult;
    }

    const priorCollection = await this.payments.findCodCollectionByIdempotencyKey(
      input.idempotencyKey,
    );
    if (priorCollection) {
      const intent = await this.payments.findIntentById(priorCollection.paymentIntentId);
      if (!intent) {
        throw new PaymentNotFoundError();
      }
      return {
        paymentIntentId: intent.id.value,
        orderId: intent.orderId,
        paymentMethod: 'COD',
        status: 'COLLECTED',
        amountMinor: priorCollection.amountMinor,
        currencyCode: priorCollection.currencyCode,
        collectionId: priorCollection.id,
        collectedAt: priorCollection.collectedAt.toISOString(),
      };
    }

    return this.payments.withTransaction(async (repo) => {
      const intent = await repo.findIntentById(input.paymentIntentId);
      if (!intent) {
        throw new PaymentNotFoundError();
      }

      if (!skipStaffAuthz) {
        await this.authz.requireCodCollector(intent, input.actorUserId, input.actorRoles);
      }

      if (intent.status === 'COLLECTED') {
        const existing = await repo.findCodCollectionByIdempotencyKey(input.idempotencyKey);
        if (existing) {
          return {
            paymentIntentId: intent.id.value,
            orderId: intent.orderId,
            paymentMethod: 'COD' as const,
            status: 'COLLECTED' as const,
            amountMinor: existing.amountMinor,
            currencyCode: existing.currencyCode,
            collectionId: existing.id,
            collectedAt: existing.collectedAt.toISOString(),
          };
        }
        throw new CodAlreadyCollectedError();
      }

      intent.assertCollectible();

      const currency = input.currencyCode.trim().toUpperCase();
      if (input.amountMinor !== intent.amountMinor || currency !== intent.currencyCode) {
        throw new CodAmountMismatchError();
      }

      intent.markCollected();
      await repo.saveIntent(intent);

      const collectedAt = new Date();
      const collection = await repo.saveCodCollection({
        paymentIntentId: intent.id.value,
        orderId: intent.orderId,
        collectorUserId: input.actorUserId,
        amountMinor: intent.amountMinor,
        currencyCode: intent.currencyCode,
        note: input.note?.trim() || null,
        idempotencyKey: input.idempotencyKey,
        collectedAt,
      });

      await this.orders.markPaidFromPayment({
        orderId: intent.orderId,
        paymentIntentId: intent.id.value,
        amountMinor: intent.amountMinor,
        currencyCode: intent.currencyCode,
      });

      const result: ConfirmCodCollectionResult = {
        paymentIntentId: intent.id.value,
        orderId: intent.orderId,
        paymentMethod: 'COD',
        status: 'COLLECTED',
        amountMinor: intent.amountMinor,
        currencyCode: intent.currencyCode,
        collectionId: collection.id,
        collectedAt: collectedAt.toISOString(),
      };

      await repo.saveOperation({
        idempotencyKey: input.idempotencyKey,
        operationType: 'COLLECT_COD',
        requestHash,
        responseJson: result as unknown as Record<string, unknown>,
      });

      return result;
    });
  }
}

@Injectable()
export class CancelCodPaymentHandler {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    private readonly authz: PaymentAuthorizationService,
  ) {}

  public async execute(input: CancelPaymentIntentInput): Promise<void> {
    const requestHash = hashCancel(input);
    const prior = await this.payments.findOperation(input.idempotencyKey);
    if (prior) {
      if (prior.requestHash !== requestHash) {
        throw new PaymentIdempotencyConflictError();
      }
      return;
    }

    const intent = await this.payments.findIntentById(input.paymentIntentId);
    if (!intent) {
      throw new PaymentNotFoundError();
    }
    await this.authz.requireCodCollector(intent, input.actorUserId, input.actorRoles);
    intent.cancel();
    await this.payments.saveIntent(intent);
    await this.payments.saveOperation({
      idempotencyKey: input.idempotencyKey,
      operationType: 'CANCEL_COD',
      requestHash,
      responseJson: { paymentIntentId: intent.id.value, status: intent.status },
    });
  }
}

function toCreateResult(intent: PaymentIntent): CreatePaymentIntentResult {
  const result: CreatePaymentIntentResult = {
    paymentIntentId: intent.id.value,
    paymentMethod: intent.paymentMethod,
    status: intent.status,
    amountMinor: intent.amountMinor,
    currencyCode: intent.currencyCode,
  };
  if (intent.clientSecret) {
    return { ...result, clientSecret: intent.clientSecret };
  }
  return result;
}

function hashCreateIntent(input: CreatePaymentIntentInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        checkoutId: input.checkoutId,
        orderId: input.orderId,
        vendorId: input.vendorId,
        storeId: input.storeId,
        amountMinor: input.amountMinor,
        currencyCode: input.currencyCode,
        paymentMethod: input.paymentMethod,
      }),
    )
    .digest('hex');
}

function hashCollect(input: ConfirmCodCollectionInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        paymentIntentId: input.paymentIntentId,
        amountMinor: input.amountMinor,
        currencyCode: input.currencyCode.trim().toUpperCase(),
        note: input.note ?? null,
      }),
    )
    .digest('hex');
}

function hashCancel(input: CancelPaymentIntentInput): string {
  return createHash('sha256')
    .update(JSON.stringify({ paymentIntentId: input.paymentIntentId }))
    .digest('hex');
}
