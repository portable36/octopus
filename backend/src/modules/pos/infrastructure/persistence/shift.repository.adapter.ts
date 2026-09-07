import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { ShiftRepository } from '../../application/ports/shift-repository.interface';
import type { Shift } from '../../domain/aggregates/shift.aggregate';
import { ShiftMapper } from './shift.mapper';
import { ShiftOrmEntity } from './shift.orm-entity';

@Injectable()
export class ShiftRepositoryAdapter implements ShiftRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(shift: Shift): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const orm = ShiftMapper.toOrm(shift);
      const existing = await tx.findOne(ShiftOrmEntity, { id: shift.id.value });
      if (existing) {
        tx.assign(existing, orm);
        await tx.flush();
      } else {
        await tx.persist(orm).flush();
      }
    });
  }

  public async findById(id: string): Promise<Shift | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ShiftOrmEntity, { id });
      return entity ? ShiftMapper.toDomain(entity) : null;
    });
  }

  public async findActiveByRegisterId(registerId: string): Promise<Shift | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(
        ShiftOrmEntity,
        { registerId, status: 'OPEN' },
        { orderBy: { openedAt: 'DESC' } },
      );
      return entity ? ShiftMapper.toDomain(entity) : null;
    });
  }

  public async findLatestByRegisterId(registerId: string): Promise<Shift | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(
        ShiftOrmEntity,
        { registerId },
        { orderBy: { openedAt: 'DESC' } },
      );
      return entity ? ShiftMapper.toDomain(entity) : null;
    });
  }

  public async findByStoreId(storeId: string, limit = 50): Promise<readonly Shift[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        ShiftOrmEntity,
        { storeId },
        { orderBy: { openedAt: 'DESC' }, limit },
      );
      return entities.map(ShiftMapper.toDomain);
    });
  }

  public async findActiveByStoreId(storeId: string): Promise<readonly Shift[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        ShiftOrmEntity,
        { storeId, status: 'OPEN' },
        { orderBy: { openedAt: 'DESC' } },
      );
      return entities.map(ShiftMapper.toDomain);
    });
  }
}
