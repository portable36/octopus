import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { StoreOnboardingDraftRepository } from '../../application/ports/store-onboarding-draft-repository.interface';
import type { StoreOnboardingDraftRecord } from '../../domain/store-onboarding.types';
import { StoreOnboardingDraftOrmEntity } from './store-onboarding-draft.orm-entity';

function toRecord(entity: StoreOnboardingDraftOrmEntity): StoreOnboardingDraftRecord {
  return {
    id: entity.id,
    vendorId: entity.vendorId,
    actorUserId: entity.actorUserId,
    storeId: entity.storeId,
    currentStep: entity.currentStep,
    payload: entity.payload,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class StoreOnboardingDraftRepositoryAdapter implements StoreOnboardingDraftRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(draft: StoreOnboardingDraftRecord): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(StoreOnboardingDraftOrmEntity, { id: draft.id });
      const entity = existing ?? new StoreOnboardingDraftOrmEntity();
      entity.id = draft.id;
      entity.vendorId = draft.vendorId;
      entity.actorUserId = draft.actorUserId;
      entity.storeId = draft.storeId;
      entity.currentStep = draft.currentStep;
      entity.payload = draft.payload;
      entity.status = draft.status;
      entity.updatedAt = draft.updatedAt;
      if (!entity.createdAt) {
        entity.createdAt = draft.createdAt;
      }
      await tx.persist(entity).flush();
    });
  }

  public async findById(id: string): Promise<StoreOnboardingDraftRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(StoreOnboardingDraftOrmEntity, { id });
      return entity ? toRecord(entity) : null;
    });
  }

  public async findByStoreId(storeId: string): Promise<StoreOnboardingDraftRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(StoreOnboardingDraftOrmEntity, { storeId });
      return entity ? toRecord(entity) : null;
    });
  }
}
