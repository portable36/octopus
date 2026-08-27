import { createHash } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
import { ORDER_PORT, type OrderPort } from '../../../../shared-kernel/application/ports/order.port';
import type {
  CancelPaymentIntentInput,
  ConfirmCodCollectionInput,
  ConfirmCodCollectionResult,
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  CreateRefundInput,
  CreateRefundResult,
} from '../../../../shared-kernel/application/ports/payment.port';
import { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import { Refund } from '../../domain/aggregates/refund.aggregate';
import {
  CodAmountMismatchError,
  CodAlreadyCollectedError,
  RefundNotRefundableError,
} from '../../domain/errors/payment.errors';
import { computeMaxRefundable } from '../../domain/services/max-refundable';
import { assertCurrencyMatch, resolveRefundMethod } from '../../domain/services/refundability';
import {
  PaymentIdempotencyConflictError,
  PaymentNotFoundError,
  PaymentAccessDeniedError,
} from '../errors/payment.errors';
import {
  PAYMENT_REFUND_GATEWAY,
  type PaymentRefundGateway,
} from '../ports/payment-refund-gateway.port';
import { PAYMENT_REPOSITORY, type PaymentRepository } from '../ports/payment-repository.interface';
import { PaymentAuthorizationService } from '../services/payment-authorization.service';
import { recordPaymentFailure } from '../../../../shared-kernel/infrastructure/observability/business-metrics';

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

@Injectable()
export class CreateRefundHandler {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    private readonly authz: PaymentAuthorizationService,
    @Inject(PAYMENT_REFUND_GATEWAY) private readonly gateway: PaymentRefundGateway,
    @Inject(ORDER_PORT) private readonly orders: OrderPort,
    @Optional() @Inject(AUDIT_PORT) private readonly audit: AuditPort | null = null,
  ) {}

  public async execute(input: CreateRefundInput): Promise<CreateRefundResult> {
    const requestHash = hashRefund(input);
    const prior = await this.payments.findOperation(input.idempotencyKey);
    if (prior) {
      if (prior.requestHash !== requestHash) {
        throw new PaymentIdempotencyConflictError();
      }
      return prior.responseJson as unknown as CreateRefundResult;
    }

    const reserved = await this.payments.withTransaction(async (repo) => {
      const intent = await repo.findIntentById(input.paymentIntentId);
      if (!intent) {
        throw new PaymentNotFoundError();
      }

      await this.authz.requireRefundCreator(intent, input.actorUserId, input.actorRoles);
      const currency = assertCurrencyMatch(intent.currencyCode, input.currencyCode);
      const method = resolveRefundMethod({
        paymentMethod: intent.paymentMethod,
        status: intent.status,
      });

      const consumed = await repo.sumRefundedOrPendingMinor(intent.id.value);
      const available = computeMaxRefundable({
        capturedAmountMinor: intent.amountMinor,
        refundedOrPendingMinor: consumed,
      });

      const refund = Refund.create({
        paymentIntentId: intent.id.value,
        orderId: intent.orderId,
        vendorId: intent.vendorId,
        storeId: intent.storeId,
        returnId: input.returnId ?? null,
        amountMinor: input.amountMinor,
        currencyCode: currency,
        method,
        reason: input.reason ?? null,
        availableMinor: available,
      });

      await repo.saveRefund(refund);
      return { intent, refund, method };
    });

    const gatewayResult = await this.gateway.execute({
      paymentIntentId: reserved.intent.id.value,
      refundId: reserved.refund.id.value,
      provider: reserved.intent.provider,
      paymentMethod: reserved.intent.paymentMethod,
      method: reserved.method,
      amountMinor: reserved.refund.amountMinor,
      currencyCode: reserved.refund.currencyCode,
      idempotencyKey: input.idempotencyKey,
    });

    const finance = await this.orders.getFinanceSnapshot(reserved.refund.orderId);

    const outcome = await this.payments.withTransaction(async (repo) => {
      const refund = (await repo.findRefundById(reserved.refund.id.value)) ?? reserved.refund;

      if (refund.status === 'SUCCEEDED') {
        const result = toRefundResult(refund);
        await repo.saveOperation({
          idempotencyKey: input.idempotencyKey,
          operationType: 'CREATE_REFUND',
          requestHash,
          responseJson: result as unknown as Record<string, unknown>,
        });
        return { result, freshlySucceeded: false as const, refund };
      }

      if (!gatewayResult.ok) {
        recordPaymentFailure('refund_provider');
        refund.markFailed({
          providerResponseCode: gatewayResult.responseCode,
          providerReceivedAt: gatewayResult.receivedAt,
        });
        await repo.saveRefund(refund);
        throw new RefundNotRefundableError(
          `Refund provider rejected the request (${gatewayResult.responseCode}).`,
        );
      }

      refund.markSucceeded({
        providerRefundId: gatewayResult.providerRefundId,
        providerResponseCode: gatewayResult.responseCode,
        providerReceivedAt: gatewayResult.receivedAt,
        orderCommissionMinor: finance?.commissionMinor ?? null,
        orderTotalMinor: finance?.totalMinor ?? null,
      });
      await repo.saveRefund(refund);

      const result = toRefundResult(refund);
      await repo.saveOperation({
        idempotencyKey: input.idempotencyKey,
        operationType: 'CREATE_REFUND',
        requestHash,
        responseJson: result as unknown as Record<string, unknown>,
      });
      return { result, freshlySucceeded: true as const, refund };
    });

    if (outcome.freshlySucceeded) {
      const { refund } = outcome;
      await this.audit?.append({
        actorUserId: input.actorUserId,
        action: 'payment.refund.succeeded',
        resourceType: 'refund',
        resourceId: refund.id.value,
        vendorId: refund.vendorId,
        storeId: refund.storeId,
        after: {
          status: refund.status,
          amountMinor: refund.amountMinor,
          currencyCode: refund.currencyCode,
          paymentIntentId: refund.paymentIntentId,
          orderId: refund.orderId,
        },
        metadata:
          input.reason !== undefined && input.reason !== null ? { reason: input.reason } : null,
      });
    }
    return outcome.result;
  }
}

@Injectable()
export class ListPaymentIntentsHandler {
  constructor(@Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository) {}

  public async listRecentForPlatform(input: {
    readonly actorRoles: readonly string[];
    readonly limit?: number;
  }): Promise<PaymentIntent[]> {
    if (!input.actorRoles.includes('PLATFORM_ADMIN')) {
      throw new PaymentAccessDeniedError('Platform admin required to list payment intents.');
    }
    return this.payments.listRecentIntents(input.limit ?? 50);
  }
}

function toRefundResult(refund: Refund): CreateRefundResult {
  return {
    refundId: refund.id.value,
    paymentIntentId: refund.paymentIntentId,
    orderId: refund.orderId,
    amountMinor: refund.amountMinor,
    currencyCode: refund.currencyCode,
    method: refund.method,
    status: refund.status,
    returnId: refund.returnId,
    providerRefundId: refund.providerRefundId,
    completedAt: (refund.completedAt ?? refund.updatedAt).toISOString(),
  };
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

function hashRefund(input: CreateRefundInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        paymentIntentId: input.paymentIntentId,
        amountMinor: input.amountMinor,
        currencyCode: input.currencyCode.trim().toUpperCase(),
        returnId: input.returnId ?? null,
        reason: input.reason ?? null,
      }),
    )
    .digest('hex');
}
