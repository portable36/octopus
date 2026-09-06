import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { RegisterRepository } from '../../application/ports/register-repository.interface';
import type { Register } from '../../domain/aggregates/register.aggregate';
import { applyRegisterToOrm, registerToDomain } from './register.mapper';
import { RegisterOrmEntity } from './register.orm-entity';

@Injectable()
export class RegisterRepositoryAdapter implements RegisterRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(register: Register): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(RegisterOrmEntity, { id: register.id.value });
      const entity = existing ?? new RegisterOrmEntity();
      applyRegisterToOrm(register, entity);
      await tx.persist(entity).flush();
    });
  }

  public async findById(id: string): Promise<Register | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(RegisterOrmEntity, { id });
      return entity ? registerToDomain(entity) : null;
    });
  }

  public async findByStoreId(storeId: string): Promise<readonly Register[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(RegisterOrmEntity, { storeId }, { orderBy: { code: 'ASC' } });
      return entities.map(registerToDomain);
    });
  }

  public async findByStoreAndCode(storeId: string, code: string): Promise<Register | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(RegisterOrmEntity, { storeId, code });
      return entity ? registerToDomain(entity) : null;
    });
  }
}
