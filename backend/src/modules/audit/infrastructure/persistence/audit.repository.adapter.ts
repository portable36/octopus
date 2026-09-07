import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type {
  AuditFilterQuery,
  AuditQueryResult,
  AuditRepository,
} from '../../application/ports/audit-repository.interface';
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

  public async listRecent(limit: number, actionPrefix?: string): Promise<AuditEventRecord[]> {
    return withRlsContext(this.em, async (tx) => {
      const where =
        actionPrefix && actionPrefix.trim() !== ''
          ? { action: { $like: `${actionPrefix.trim()}%` } }
          : {};
      const entities = await tx.find(AuditEventOrmEntity, where, {
        orderBy: { createdAt: 'DESC' },
        limit,
      });
      return entities.map(toRecord);
    });
  }

  public async query(filter: AuditFilterQuery): Promise<AuditQueryResult> {
    return withRlsContext(this.em, async (tx) => {
      const where: Record<string, unknown> = {};
      if (filter.action && filter.action.trim() !== '') {
        where.action = filter.action.trim();
      } else if (filter.actionPrefix && filter.actionPrefix.trim() !== '') {
        where.action = { $like: `${filter.actionPrefix.trim()}%` };
      }
      if (filter.resourceType && filter.resourceType.trim() !== '') {
        where.resourceType = filter.resourceType.trim();
      }
      if (filter.resourceId && filter.resourceId.trim() !== '') {
        where.resourceId = filter.resourceId.trim();
      }
      if (filter.actorUserId && filter.actorUserId.trim() !== '') {
        where.actorUserId = filter.actorUserId.trim();
      }
      if (filter.vendorId && filter.vendorId.trim() !== '') {
        where.vendorId = filter.vendorId.trim();
      }
      if (filter.storeId && filter.storeId.trim() !== '') {
        where.storeId = filter.storeId.trim();
      }
      if (filter.fromDate || filter.toDate) {
        const createdAtFilter: Record<string, Date> = {};
        if (filter.fromDate) {
          createdAtFilter.$gte = filter.fromDate;
        }
        if (filter.toDate) {
          createdAtFilter.$lte = filter.toDate;
        }
        where.createdAt = createdAtFilter;
      }

      const limit = Math.min(Math.max(filter.limit ?? 50, 1), 100);
      const offset = Math.max(filter.offset ?? 0, 0);

      const [entities, total] = await tx.findAndCount(AuditEventOrmEntity, where, {
        orderBy: { createdAt: 'DESC' },
        limit,
        offset,
      });

      return {
        items: entities.map(toRecord),
        total,
      };
    });
  }
}
