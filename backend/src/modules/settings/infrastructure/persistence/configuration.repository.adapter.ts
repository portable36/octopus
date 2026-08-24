import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { ConfigurationRepository } from '../../application/ports/configuration-repository.interface';
import type {
  ConfigurationDocumentRecord,
  ConfigurationKey,
  ConfigurationScope,
} from '../../domain/settings.types';
import { ConfigurationDocumentOrmEntity } from './configuration-document.orm-entity';

function toRecord(entity: ConfigurationDocumentOrmEntity): ConfigurationDocumentRecord {
  return {
    id: entity.id,
    key: entity.key,
    scopeKind: entity.scopeKind,
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    schemaVersion: entity.schemaVersion,
    payload: entity.payload,
    updatedAt: entity.updatedAt,
    updatedBy: entity.updatedBy,
  };
}

function scopeFilter(scope: ConfigurationScope): {
  scopeKind: ConfigurationScope['kind'];
  vendorId: string | null;
  storeId: string | null;
} {
  if (scope.kind === 'platform') {
    return { scopeKind: 'platform', vendorId: null, storeId: null };
  }
  if (scope.kind === 'vendor') {
    return { scopeKind: 'vendor', vendorId: scope.vendorId, storeId: null };
  }
  return { scopeKind: 'store', vendorId: scope.vendorId, storeId: scope.storeId };
}

@Injectable()
export class ConfigurationRepositoryAdapter implements ConfigurationRepository {
  constructor(private readonly em: EntityManager) {}

  public async findForResolution(
    key: ConfigurationKey,
    target: ConfigurationScope,
  ): Promise<ConfigurationDocumentRecord[]> {
    return withRlsContext(this.em, async (tx) => {
      const orFilters: Array<Record<string, unknown>> = [
        { key, scopeKind: 'platform', vendorId: null, storeId: null },
      ];
      if (target.kind === 'vendor' || target.kind === 'store') {
        orFilters.push({
          key,
          scopeKind: 'vendor',
          vendorId: target.vendorId,
          storeId: null,
        });
      }
      if (target.kind === 'store') {
        orFilters.push({
          key,
          scopeKind: 'store',
          vendorId: target.vendorId,
          storeId: target.storeId,
        });
      }

      const entities = await tx.find(ConfigurationDocumentOrmEntity, { $or: orFilters });
      return entities.map(toRecord);
    });
  }

  public async findByScopeKey(
    key: ConfigurationKey,
    scope: ConfigurationScope,
  ): Promise<ConfigurationDocumentRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const filter = scopeFilter(scope);
      const entity = await tx.findOne(ConfigurationDocumentOrmEntity, { key, ...filter });
      return entity ? toRecord(entity) : null;
    });
  }

  public async save(input: {
    readonly id: string;
    readonly key: ConfigurationKey;
    readonly scope: ConfigurationScope;
    readonly schemaVersion: number;
    readonly payload: Record<string, unknown>;
    readonly updatedBy: string;
  }): Promise<ConfigurationDocumentRecord> {
    return withRlsContext(this.em, async (tx) => {
      const filter = scopeFilter(input.scope);
      const existing = await tx.findOne(ConfigurationDocumentOrmEntity, {
        key: input.key,
        ...filter,
      });
      const entity = existing ?? new ConfigurationDocumentOrmEntity();
      entity.id = existing?.id ?? input.id;
      entity.key = input.key;
      entity.scopeKind = filter.scopeKind;
      entity.vendorId = filter.vendorId;
      entity.storeId = filter.storeId;
      entity.schemaVersion = input.schemaVersion;
      entity.payload = input.payload;
      entity.updatedAt = new Date();
      entity.updatedBy = input.updatedBy;
      await tx.persist(entity).flush();
      return toRecord(entity);
    });
  }
}
