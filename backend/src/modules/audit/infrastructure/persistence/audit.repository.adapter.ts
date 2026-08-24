import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { AuditRepository } from '../../application/ports/audit-repository.interface';
import type { AuditEventRecord } from '../../domain/audit.types';
import { AuditEventOrmEntity } from './audit-event.orm-entity';

function toRecord(entity: AuditEventOrmEntity): AuditEventRecord {
  return {
    id: entity.id,
    actorUserId: entity.actorUserId,
    action: entity.action,
    resourceType: entity.resourceType,
    resourceId: entity.resourceId,
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    requestId: entity.requestId,
    before: entity.before,
    after: entity.after,
    metadata: entity.metadata,
    createdAt: entity.createdAt,
  };
}

@Injectable()
export class AuditRepositoryAdapter implements AuditRepository {
  constructor(private readonly em: EntityManager) {}

  public async append(event: AuditEventRecord): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const entity = new AuditEventOrmEntity();
      entity.id = event.id;
      entity.actorUserId = event.actorUserId;
      entity.action = event.action;
      entity.resourceType = event.resourceType;
      entity.resourceId = event.resourceId;
      entity.vendorId = event.vendorId;
      entity.storeId = event.storeId;
      entity.requestId = event.requestId;
      entity.before = event.before;
      entity.after = event.after;
      entity.metadata = event.metadata;
      entity.createdAt = event.createdAt;
      await tx.persist(entity).flush();
    });
  }

  public async listRecent(limit: number): Promise<AuditEventRecord[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        AuditEventOrmEntity,
        {},
        { orderBy: { createdAt: 'DESC' }, limit },
      );
      return entities.map(toRecord);
    });
  }
}
