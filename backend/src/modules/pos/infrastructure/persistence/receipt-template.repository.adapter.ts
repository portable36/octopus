import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { ReceiptTemplateRepository } from '../../application/ports/receipt-template-repository.interface';
import type { ReceiptTemplate } from '../../domain/aggregates/receipt-template.aggregate';
import { applyTemplateToOrm, templateToDomain } from './receipt-template.mapper';
import { ReceiptTemplateOrmEntity } from './receipt-template.orm-entity';

@Injectable()
export class ReceiptTemplateRepositoryAdapter implements ReceiptTemplateRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(template: ReceiptTemplate): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(ReceiptTemplateOrmEntity, { id: template.id.value });
      const entity = existing ?? new ReceiptTemplateOrmEntity();
      applyTemplateToOrm(template, entity);
      await tx.persist(entity).flush();
    });
  }

  public async findByStoreId(storeId: string): Promise<ReceiptTemplate | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ReceiptTemplateOrmEntity, { storeId });
      return entity ? templateToDomain(entity) : null;
    });
  }

  public async findById(id: string): Promise<ReceiptTemplate | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ReceiptTemplateOrmEntity, { id });
      return entity ? templateToDomain(entity) : null;
    });
  }
}
