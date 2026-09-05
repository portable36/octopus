import type { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import type { Refund } from '../../domain/aggregates/refund.aggregate';
import type { ConfirmCodCollectionResult } from '../../../../shared-kernel/application/ports/payment.port';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface CodCollectionRecord {
  readonly id: string;
  readonly paymentIntentId: string;
  readonly orderId: string;
  readonly collectorUserId: string;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly note: string | null;
  readonly idempotencyKey: string;
  readonly collectedAt: Date;
}

export interface PaymentRepository {
  findIntentById(id: string): Promise<PaymentIntent | null>;
  findIntentByOrderId(orderId: string): Promise<PaymentIntent | null>;
  findIntentByGatewayReference(referenceId: string): Promise<PaymentIntent | null>;
  listRecentIntents(limit: number): Promise<PaymentIntent[]>;
  saveIntent(intent: PaymentIntent): Promise<void>;
  findOperation(
    idempotencyKey: string,
  ): Promise<{ requestHash: string; responseJson: Record<string, unknown> } | null>;
  saveOperation(input: {
    readonly idempotencyKey: string;
    readonly operationType: string;
    readonly requestHash: string;
    readonly responseJson: Record<string, unknown>;
  }): Promise<void>;
  saveCodCollection(
    record: Omit<CodCollectionRecord, 'id'> & { readonly id?: string },
  ): Promise<CodCollectionRecord>;
  findCodCollectionByIdempotencyKey(idempotencyKey: string): Promise<CodCollectionRecord | null>;
  sumRefundedOrPendingMinor(paymentIntentId: string): Promise<number>;
  saveRefund(refund: Refund): Promise<void>;
  findRefundById(id: string): Promise<Refund | null>;
  appendOutbox(input: {
    readonly aggregateId: string;
    readonly eventType: string;
    readonly payload: Record<string, unknown>;
  }): Promise<void>;
  withTransaction<T>(work: (repo: PaymentRepository) => Promise<T>): Promise<T>;
}

export type { ConfirmCodCollectionResult };
