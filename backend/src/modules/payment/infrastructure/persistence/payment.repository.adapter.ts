import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import type { Refund } from '../../domain/aggregates/refund.aggregate';
import { REFUND_STATUSES_COUNTING_TOWARD_CAP } from '../../domain/refund.types';
import type {
  CodCollectionRecord,
  PaymentRepository,
} from '../../application/ports/payment-repository.interface';
import {
  applyPaymentIntentToOrm,
  applyRefundToOrm,
  paymentIntentToDomain,
  refundToDomain,
} from './payment.mapper';
import {
  PaymentIntentOrmEntity,
  PaymentOperationOrmEntity,
  PaymentOutboxOrmEntity,
  PaymentRefundOrmEntity,
  PaymentTransactionOrmEntity,
} from './payment.orm-entity';

@Injectable()
export class PaymentRepositoryAdapter implements PaymentRepository {
  constructor(private readonly em: EntityManager) {}

  public async findIntentById(id: string): Promise<PaymentIntent | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(PaymentIntentOrmEntity, { id });
      return entity ? paymentIntentToDomain(entity) : null;
    });
  }

  public async findIntentByOrderId(orderId: string): Promise<PaymentIntent | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(PaymentIntentOrmEntity, { orderId });
      return entity ? paymentIntentToDomain(entity) : null;
    });
  }

  public async findIntentByGatewayReference(referenceId: string): Promise<PaymentIntent | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(PaymentIntentOrmEntity, { gatewayReferenceId: referenceId });
      return entity ? paymentIntentToDomain(entity) : null;
    });
  }

  public async listRecentIntents(limit: number): Promise<PaymentIntent[]> {
    const capped = Math.min(Math.max(limit, 1), 200);
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        PaymentIntentOrmEntity,
        {},
        { orderBy: { createdAt: 'DESC' }, limit: capped },
      );
      return entities.map(paymentIntentToDomain);
    });
  }

  public async saveIntent(intent: PaymentIntent): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(PaymentIntentOrmEntity, { id: intent.id.value });
      if (!entity) {
        entity = new PaymentIntentOrmEntity();
      }
      applyPaymentIntentToOrm(intent, entity);
      await tx.persist(entity).flush();
      for (const event of intent.getUncommittedEvents()) {
        await this.appendOutboxInTx(tx, {
          aggregateId: intent.id.value,
          eventType: event.eventName,
          payload: event.payload,
        });
      }
      intent.clearEvents();
    });
  }

  public async findOperation(
    idempotencyKey: string,
  ): Promise<{ requestHash: string; responseJson: Record<string, unknown> } | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(PaymentOperationOrmEntity, { idempotencyKey });
      if (!entity) {
        return null;
      }
      return { requestHash: entity.requestHash, responseJson: entity.responseJson };
    });
  }

  public async saveOperation(input: {
    readonly idempotencyKey: string;
    readonly operationType: string;
    readonly requestHash: string;
    readonly responseJson: Record<string, unknown>;
  }): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const entity = new PaymentOperationOrmEntity();
      entity.id = UniqueID.create().value;
      entity.idempotencyKey = input.idempotencyKey;
      entity.operationType = input.operationType;
      entity.requestHash = input.requestHash;
      entity.responseJson = input.responseJson;
      entity.createdAt = new Date();
      try {
        await tx.persist(entity).flush();
      } catch (error) {
        if (!(error instanceof UniqueConstraintViolationException)) {
          throw error;
        }
      }
    });
  }

  public async saveCodCollection(
    record: Omit<CodCollectionRecord, 'id'> & { readonly id?: string },
  ): Promise<CodCollectionRecord> {
    return withRlsContext(this.em, async (tx) => {
      const entity = new PaymentTransactionOrmEntity();
      entity.id = record.id ?? UniqueID.create().value;
      entity.paymentIntentId = record.paymentIntentId;
      entity.orderId = record.orderId;
      entity.collectorUserId = record.collectorUserId;
      entity.amountMinor = record.amountMinor;
      entity.currencyCode = record.currencyCode;
      entity.note = record.note;
      entity.idempotencyKey = record.idempotencyKey;
      entity.collectedAt = record.collectedAt;
      entity.createdAt = new Date();
      await tx.persist(entity).flush();
      return {
        id: entity.id,
        paymentIntentId: entity.paymentIntentId,
        orderId: entity.orderId,
        collectorUserId: entity.collectorUserId,
        amountMinor: entity.amountMinor,
        currencyCode: entity.currencyCode,
        note: entity.note,
        idempotencyKey: entity.idempotencyKey,
        collectedAt: entity.collectedAt,
      };
    });
  }

  public async findCodCollectionByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<CodCollectionRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(PaymentTransactionOrmEntity, { idempotencyKey });
      if (!entity) {
        return null;
      }
      return {
        id: entity.id,
        paymentIntentId: entity.paymentIntentId,
        orderId: entity.orderId,
        collectorUserId: entity.collectorUserId,
        amountMinor: entity.amountMinor,
        currencyCode: entity.currencyCode,
        note: entity.note,
        idempotencyKey: entity.idempotencyKey,
        collectedAt: entity.collectedAt,
      };
    });
  }

  public async sumRefundedOrPendingMinor(paymentIntentId: string): Promise<number> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(PaymentRefundOrmEntity, {
        paymentIntentId,
        status: { $in: [...REFUND_STATUSES_COUNTING_TOWARD_CAP] },
      });
      return rows.reduce((sum, row) => sum + row.amountMinor, 0);
    });
  }

  public async saveRefund(refund: Refund): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(PaymentRefundOrmEntity, { id: refund.id.value });
      if (!entity) {
        entity = new PaymentRefundOrmEntity();
      }
      applyRefundToOrm(refund, entity);
      await tx.persist(entity).flush();
      for (const event of refund.getUncommittedEvents()) {
        await this.appendOutboxInTx(tx, {
          aggregateId: refund.id.value,
          eventType: event.eventName,
          payload: event.payload,
        });
      }
      refund.clearEvents();
    });
  }

  public async findRefundById(id: string): Promise<Refund | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(PaymentRefundOrmEntity, { id });
      return entity ? refundToDomain(entity) : null;
    });
  }

  public async appendOutbox(input: {
    readonly aggregateId: string;
    readonly eventType: string;
    readonly payload: Record<string, unknown>;
  }): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      await this.appendOutboxInTx(tx, input);
    });
  }

  public async withTransaction<T>(work: (repo: PaymentRepository) => Promise<T>): Promise<T> {
    return withRlsContext(this.em, async (tx) => {
      const transactional = new PaymentRepositoryAdapter(tx);
      return work(transactional);
    });
  }

  private async appendOutboxInTx(
    tx: EntityManager,
    input: {
      readonly aggregateId: string;
      readonly eventType: string;
      readonly payload: Record<string, unknown>;
    },
  ): Promise<void> {
    const entity = new PaymentOutboxOrmEntity();
    entity.id = UniqueID.create().value;
    entity.aggregateId = input.aggregateId;
    entity.eventType = input.eventType;
    entity.payloadJson = input.payload;
    entity.eventVersion = 1;
    entity.createdAt = new Date();
    entity.publishedAt = null;
    await tx.persist(entity).flush();
  }
}
