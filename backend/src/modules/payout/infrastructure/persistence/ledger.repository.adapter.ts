import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { LedgerEntryRecord, VendorBalanceSnapshot } from '../../domain/ledger.types';
import type { LedgerRepository } from '../../application/ports/ledger-repository.interface';
import {
  PayoutOutboxOrmEntity,
  VendorLedgerBalanceOrmEntity,
  VendorLedgerEntryOrmEntity,
} from './ledger.orm-entity';

function toRecord(entity: VendorLedgerEntryOrmEntity): LedgerEntryRecord {
  return {
    id: entity.id,
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    entryType: entity.entryType,
    direction: entity.direction,
    amountMinor: entity.amountMinor,
    currencyCode: entity.currencyCode,
    orderId: entity.orderId,
    referenceType: entity.referenceType,
    referenceId: entity.referenceId,
    idempotencyKey: entity.idempotencyKey,
    availableAt: entity.availableAt,
    occurredAt: entity.occurredAt,
    createdAt: entity.createdAt,
    metadata: entity.metadataJson,
  };
}

function buildEntryWhere(
  vendorId: string,
  filter?: { readonly from?: Date; readonly to?: Date },
): Record<string, unknown> {
  const where: Record<string, unknown> = { vendorId };
  if (filter?.from || filter?.to) {
    where.occurredAt = {
      ...(filter.from ? { $gte: filter.from } : {}),
      ...(filter.to ? { $lte: filter.to } : {}),
    };
  }
  return where;
}

@Injectable()
export class LedgerRepositoryAdapter implements LedgerRepository {
  constructor(private readonly em: EntityManager) {}

  public async findEntryByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<LedgerEntryRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(VendorLedgerEntryOrmEntity, { idempotencyKey });
      return entity ? toRecord(entity) : null;
    });
  }

  public async appendEntry(entry: LedgerEntryRecord): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const entity = new VendorLedgerEntryOrmEntity();
      entity.id = entry.id;
      entity.vendorId = entry.vendorId;
      entity.storeId = entry.storeId;
      entity.entryType = entry.entryType;
      entity.direction = entry.direction;
      entity.amountMinor = entry.amountMinor;
      entity.currencyCode = entry.currencyCode;
      entity.orderId = entry.orderId;
      entity.referenceType = entry.referenceType;
      entity.referenceId = entry.referenceId;
      entity.idempotencyKey = entry.idempotencyKey;
      entity.availableAt = entry.availableAt;
      entity.occurredAt = entry.occurredAt;
      entity.createdAt = entry.createdAt;
      entity.metadataJson = entry.metadata;
      try {
        await tx.persist(entity).flush();
      } catch (error) {
        if (!(error instanceof UniqueConstraintViolationException)) {
          throw error;
        }
      }
    });
  }

  public async listEntriesByVendorId(vendorId: string): Promise<readonly LedgerEntryRecord[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        VendorLedgerEntryOrmEntity,
        { vendorId },
        { orderBy: { occurredAt: 'ASC' } },
      );
      return rows.map(toRecord);
    });
  }

  public async listEntriesByVendorIdPaged(
    vendorId: string,
    limit: number,
    offset: number,
    filter?: { readonly from?: Date; readonly to?: Date },
  ): Promise<readonly LedgerEntryRecord[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(VendorLedgerEntryOrmEntity, buildEntryWhere(vendorId, filter), {
        orderBy: { occurredAt: 'DESC' },
        limit,
        offset,
      });
      return rows.map(toRecord);
    });
  }

  public async countEntriesByVendorId(
    vendorId: string,
    filter?: { readonly from?: Date; readonly to?: Date },
  ): Promise<number> {
    return withRlsContext(this.em, async (tx) => {
      return tx.count(VendorLedgerEntryOrmEntity, buildEntryWhere(vendorId, filter));
    });
  }

  public async saveBalance(snapshot: VendorBalanceSnapshot): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(VendorLedgerBalanceOrmEntity, { vendorId: snapshot.vendorId });
      if (!entity) {
        entity = new VendorLedgerBalanceOrmEntity();
        entity.vendorId = snapshot.vendorId;
      }
      entity.currencyCode = snapshot.currencyCode;
      entity.pendingMinor = snapshot.pendingMinor;
      entity.availableMinor = snapshot.availableMinor;
      entity.rebuiltAt = snapshot.rebuiltAt;
      await tx.persist(entity).flush();
    });
  }

  public async findBalance(vendorId: string): Promise<VendorBalanceSnapshot | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(VendorLedgerBalanceOrmEntity, { vendorId });
      if (!entity) {
        return null;
      }
      return {
        vendorId: entity.vendorId,
        currencyCode: entity.currencyCode,
        pendingMinor: entity.pendingMinor,
        availableMinor: entity.availableMinor,
        rebuiltAt: entity.rebuiltAt,
      };
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

  public async withTransaction<T>(work: (repo: LedgerRepository) => Promise<T>): Promise<T> {
    return withRlsContext(this.em, async (tx) => {
      const transactional = new LedgerRepositoryAdapter(tx);
      return work(transactional);
    });
  }
}
