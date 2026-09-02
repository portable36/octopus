import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type {
  StoreDomainRecord,
  StoreProvisioningRepository,
} from '../../application/ports/store-provisioning-repository.interface';
import type {
  ProvisioningRunRecord,
  ProvisioningStepName,
  ProvisioningStepRecord,
  ProvisioningStepStatus,
} from '../../domain/store-onboarding.types';
import { StoreDomainOrmEntity } from './store-domain.orm-entity';
import { StoreProvisioningRunOrmEntity } from './store-provisioning-run.orm-entity';
import { StoreProvisioningStepOrmEntity } from './store-provisioning-step.orm-entity';

function toRunRecord(entity: StoreProvisioningRunOrmEntity): ProvisioningRunRecord {
  return {
    id: entity.id,
    storeId: entity.storeId,
    status: entity.status,
    startedAt: entity.startedAt,
    completedAt: entity.completedAt,
    lastError: entity.lastError,
  };
}

function toStepRecord(entity: StoreProvisioningStepOrmEntity): ProvisioningStepRecord {
  return {
    id: entity.id,
    runId: entity.runId,
    stepName: entity.stepName,
    status: entity.status,
    startedAt: entity.startedAt,
    completedAt: entity.completedAt,
    error: entity.error,
    retryCount: entity.retryCount,
  };
}

@Injectable()
export class StoreProvisioningRepositoryAdapter implements StoreProvisioningRepository {
  constructor(private readonly em: EntityManager) {}

  public async createRun(storeId: string): Promise<ProvisioningRunRecord> {
    return withRlsContext(this.em, async (tx) => {
      const entity = new StoreProvisioningRunOrmEntity();
      entity.id = UniqueID.create().value;
      entity.storeId = storeId;
      entity.status = 'running';
      entity.startedAt = new Date();
      await tx.persist(entity).flush();
      return toRunRecord(entity);
    });
  }

  public async findLatestRunByStoreId(storeId: string): Promise<ProvisioningRunRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(
        StoreProvisioningRunOrmEntity,
        { storeId },
        { orderBy: { startedAt: 'DESC' } },
      );
      return entity ? toRunRecord(entity) : null;
    });
  }

  public async findLatestRunWithStepsByStoreId(
    storeId: string,
  ): Promise<{ run: ProvisioningRunRecord; steps: ProvisioningStepRecord[] } | null> {
    return withRlsContext(this.em, async (tx) => {
      const runEntity = await tx.findOne(
        StoreProvisioningRunOrmEntity,
        { storeId },
        { orderBy: { startedAt: 'DESC' } },
      );
      if (!runEntity) {
        return null;
      }
      const stepEntities = await tx.find(StoreProvisioningStepOrmEntity, { runId: runEntity.id });
      return {
        run: toRunRecord(runEntity),
        steps: stepEntities.map(toStepRecord),
      };
    });
  }

  public async updateRun(run: ProvisioningRunRecord): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOneOrFail(StoreProvisioningRunOrmEntity, { id: run.id });
      entity.status = run.status;
      entity.completedAt = run.completedAt;
      entity.lastError = run.lastError;
      await tx.flush();
    });
  }

  public async findStep(
    runId: string,
    stepName: ProvisioningStepName,
  ): Promise<ProvisioningStepRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(StoreProvisioningStepOrmEntity, { runId, stepName });
      return entity ? toStepRecord(entity) : null;
    });
  }

  public async saveStep(step: ProvisioningStepRecord): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(StoreProvisioningStepOrmEntity, { id: step.id });
      const entity = existing ?? new StoreProvisioningStepOrmEntity();
      entity.id = step.id;
      entity.runId = step.runId;
      entity.stepName = step.stepName;
      entity.status = step.status;
      entity.startedAt = step.startedAt;
      entity.completedAt = step.completedAt;
      entity.error = step.error;
      entity.retryCount = step.retryCount;
      await tx.persist(entity).flush();
    });
  }

  public async markStepStatus(
    runId: string,
    stepName: ProvisioningStepName,
    status: ProvisioningStepStatus,
    patch?: { readonly error?: string | null; readonly startedAt?: Date; readonly completedAt?: Date },
  ): Promise<ProvisioningStepRecord> {
    return withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(StoreProvisioningStepOrmEntity, { runId, stepName });
      if (!entity) {
        entity = new StoreProvisioningStepOrmEntity();
        entity.id = UniqueID.create().value;
        entity.runId = runId;
        entity.stepName = stepName;
        entity.status = 'pending';
        entity.retryCount = 0;
      }
      entity.status = status;
      if (patch?.startedAt !== undefined) {
        entity.startedAt = patch.startedAt;
      } else if (status === 'running' && !entity.startedAt) {
        entity.startedAt = new Date();
      }
      if (patch?.completedAt !== undefined) {
        entity.completedAt = patch.completedAt;
      } else if (status === 'completed' || status === 'failed') {
        entity.completedAt = new Date();
      }
      if (patch?.error !== undefined) {
        entity.error = patch.error;
      }
      if (status === 'failed') {
        entity.retryCount += 1;
      }
      await tx.persist(entity).flush();
      return toStepRecord(entity);
    });
  }

  public async saveDomain(domain: StoreDomainRecord): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(StoreDomainOrmEntity, { id: domain.id });
      const entity = existing ?? new StoreDomainOrmEntity();
      entity.id = domain.id;
      entity.storeId = domain.storeId;
      entity.hostname = domain.hostname;
      entity.kind = domain.kind;
      entity.isPrimary = domain.isPrimary;
      entity.verificationStatus = domain.verificationStatus;
      if (!entity.createdAt) {
        entity.createdAt = domain.createdAt;
      }
      await tx.persist(entity).flush();
    });
  }

  public async existsHostname(hostname: string): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const count = await tx.count(StoreDomainOrmEntity, {
        hostname: hostname.trim().toLowerCase(),
      });
      return count > 0;
    });
  }
}
