import { EntityManager, LockMode, UniqueConstraintViolationException } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { VendorPayout } from '../../domain/aggregates/vendor-payout.aggregate';
import { computeVendorBalance } from '../../domain/services/compute-vendor-balance';
import { PAYOUT_RESERVING_STATUSES } from '../../domain/payout.types';
import type { PayoutRepository } from '../../application/ports/payout-repository.interface';
import {
  PayoutOutboxOrmEntity,
  VendorLedgerBalanceOrmEntity,
  VendorLedgerEntryOrmEntity,
} from './ledger.orm-entity';
import { applyPayoutAggregate, toPayoutAggregate } from './payout.mapper';
import { VendorPayoutOrmEntity } from './payout.orm-entity';

@Injectable()
export class PayoutRepositoryAdapter implements PayoutRepository {
  constructor(private readonly em: EntityManager) {}

  public async findById(id: string): Promise<VendorPayout | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(VendorPayoutOrmEntity, { id });
      return entity ? toPayoutAggregate(entity) : null;
    });
  }

  public async findByIdempotencyKey(idempotencyKey: string): Promise<VendorPayout | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(VendorPayoutOrmEntity, { idempotencyKey });
      return entity ? toPayoutAggregate(entity) : null;
    });
  }

  public async listByVendorId(
    vendorId: string,
    limit: number,
    offset: number,
  ): Promise<readonly VendorPayout[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        VendorPayoutOrmEntity,
        { vendorId },
        { orderBy: { requestedAt: 'DESC' }, limit, offset },
      );
      return rows.map(toPayoutAggregate);
    });
  }

  public async sumReservedMinor(vendorId: string, excludePayoutId?: string): Promise<number> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        VendorPayoutOrmEntity,
        {
          vendorId,
          status: { $in: [...PAYOUT_RESERVING_STATUSES] },
          ...(excludePayoutId ? { id: { $ne: excludePayoutId } } : {}),
        },
        { fields: ['amountMinor'] },
      );
      return rows.reduce((sum, row) => sum + row.amountMinor, 0);
    });
  }

  public async listCompletedForVendor(
    vendorId: string,
  ): Promise<readonly { readonly id: string; readonly ledgerEntryId: string | null }[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        VendorPayoutOrmEntity,
        { vendorId, status: 'COMPLETED' },
        { fields: ['id', 'ledgerEntryId'] },
      );
      return rows.map((row) => ({ id: row.id, ledgerEntryId: row.ledgerEntryId }));
    });
  }

  public async lockVendorBalance(vendorId: string, currencyCode: string): Promise<void> {
    return withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(
        VendorLedgerBalanceOrmEntity,
        { vendorId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!entity) {
        entity = new VendorLedgerBalanceOrmEntity();
        entity.vendorId = vendorId;
        entity.currencyCode = currencyCode;
        entity.pendingMinor = 0;
        entity.availableMinor = 0;
        entity.rebuiltAt = new Date();
        await tx.persist(entity).flush();
        await tx.lock(entity, LockMode.PESSIMISTIC_WRITE);
      }
    });
  }

  public async computeAvailableMinor(vendorId: string): Promise<number> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(VendorLedgerEntryOrmEntity, { vendorId });
      const computed = computeVendorBalance(
        rows.map((row) => ({
          direction: row.direction,
          amountMinor: row.amountMinor,
          currencyCode: row.currencyCode,
          availableAt: row.availableAt,
        })),
        new Date(),
      );
      return computed.availableMinor;
    });
  }

  public async save(payout: VendorPayout): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(VendorPayoutOrmEntity, { id: payout.id.value });
      if (!entity) {
        entity = new VendorPayoutOrmEntity();
      }
      applyPayoutAggregate(entity, payout);
      try {
        await tx.persist(entity).flush();
      } catch (error) {
        if (!(error instanceof UniqueConstraintViolationException)) {
          throw error;
        }
      }
    });
  }

  public async appendOutbox(input: {
    readonly aggregateId: string;
    readonly eventType: string;
    readonly payload: Record<string, unknown>;
  }): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const entity = new PayoutOutboxOrmEntity();
      entity.id = UniqueID.create().value;
      entity.aggregateId = input.aggregateId;
      entity.eventType = input.eventType;
      entity.payloadJson = input.payload;
      entity.eventVersion = 1;
      entity.createdAt = new Date();
      entity.publishedAt = null;
      await tx.persist(entity).flush();
    });
  }

  public async withTransaction<T>(work: (repo: PayoutRepository) => Promise<T>): Promise<T> {
    return withRlsContext(this.em, async (tx) => {
      const transactional = new PayoutRepositoryAdapter(tx);
      return work(transactional);
    });
  }
}
