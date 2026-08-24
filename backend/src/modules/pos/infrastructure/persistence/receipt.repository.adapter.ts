import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import type { ReceiptRepository } from '../../application/ports/receipt-repository.interface';
import { formatReceiptNumber, type Receipt } from '../../domain/aggregates/receipt.aggregate';
import { applyReceiptToOrm, receiptToDomain } from './receipt.mapper';
import { ReceiptOrmEntity } from './receipt.orm-entity';
import { ReceiptSequenceOrmEntity } from './receipt-sequence.orm-entity';

@Injectable()
export class ReceiptRepositoryAdapter implements ReceiptRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(receipt: Receipt): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(ReceiptOrmEntity, { id: receipt.id.value });
      const entity = existing ?? new ReceiptOrmEntity();
      applyReceiptToOrm(receipt, entity);
      await tx.persist(entity).flush();
    });
  }

  public async findById(id: string): Promise<Receipt | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ReceiptOrmEntity, { id });
      return entity ? receiptToDomain(entity) : null;
    });
  }

  public async findByStoreAndSaleId(storeId: string, saleId: string): Promise<Receipt | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ReceiptOrmEntity, { storeId, saleId });
      return entity ? receiptToDomain(entity) : null;
    });
  }

  public async allocateReceiptNumber(storeId: string, soldAt: Date): Promise<string> {
    return withRlsContext(this.em, async (tx) => {
      const dayKey = utcDayKey(soldAt);
      let sequence = await tx.findOne(
        ReceiptSequenceOrmEntity,
        { storeId, dayKey },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!sequence) {
        sequence = new ReceiptSequenceOrmEntity();
        sequence.id = UniqueID.create().value;
        sequence.storeId = storeId;
        sequence.dayKey = dayKey;
        sequence.nextValue = 1;
        await tx.persist(sequence).flush();
        sequence = await tx.findOneOrFail(
          ReceiptSequenceOrmEntity,
          { storeId, dayKey },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        );
      }
      const value = sequence.nextValue;
      sequence.nextValue = value + 1;
      await tx.flush();
      return formatReceiptNumber(soldAt, value);
    });
  }
}

function utcDayKey(date: Date): string {
  const yyyy = date.getUTCFullYear().toString().padStart(4, '0');
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = date.getUTCDate().toString().padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}
