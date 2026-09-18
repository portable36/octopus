import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type {
  MediaListFilter,
  MediaListResult,
  MediaRepository,
} from '../../application/ports/media-repository.interface';
import type { MediaAssetRecord, MediaAssetStatus } from '../../domain/media.types';
import { MediaAssetOrmEntity } from './media-asset.orm-entity';

function toRecord(entity: MediaAssetOrmEntity): MediaAssetRecord {
  return {
    id: entity.id,
    originalFilename: entity.originalFilename,
    contentType: entity.contentType,
    byteSize: entity.byteSize,
    storageKey: entity.storageKey,
    uploadedBy: entity.uploadedBy,
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    status: entity.status as MediaAssetStatus,
    rejectionReason: entity.rejectionReason,
    processedAt: entity.processedAt,
    createdAt: entity.createdAt,
  };
}

@Injectable()
export class MediaRepositoryAdapter implements MediaRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(asset: MediaAssetRecord): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const entity = new MediaAssetOrmEntity();
      entity.id = asset.id;
      entity.originalFilename = asset.originalFilename;
      entity.contentType = asset.contentType;
      entity.byteSize = asset.byteSize;
      entity.storageKey = asset.storageKey;
      entity.uploadedBy = asset.uploadedBy;
      entity.vendorId = asset.vendorId;
      entity.storeId = asset.storeId;
      entity.status = asset.status;
      entity.rejectionReason = asset.rejectionReason;
      entity.processedAt = asset.processedAt;
      entity.createdAt = asset.createdAt;
      await tx.persist(entity).flush();
    });
  }

  public async findById(id: string): Promise<MediaAssetRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(MediaAssetOrmEntity, { id });
      if (!entity) {
        return null;
      }
      return toRecord(entity);
    });
  }

  public async list(filter: MediaListFilter): Promise<MediaListResult> {
    return withRlsContext(this.em, async (tx) => {
      const where: Record<string, unknown> = {};
      if (filter.scope === 'platform' || filter.scope == null) {
        where.vendorId = null;
      }
      if (filter.status) {
        where.status = filter.status;
      } else if (!filter.includeArchived) {
        where.status = { $ne: 'archived' };
      }
      if (filter.contentType?.trim()) {
        where.contentType = filter.contentType.trim().toLowerCase();
      }
      if (filter.q?.trim()) {
        where.originalFilename = { $like: `%${filter.q.trim()}%` };
      }
      if (filter.cursor?.trim()) {
        const cursorDate = new Date(filter.cursor.trim());
        if (!Number.isNaN(cursorDate.getTime())) {
          where.createdAt = { $lt: cursorDate };
        }
      }

      const rows = await tx.find(MediaAssetOrmEntity, where, {
        orderBy: { createdAt: 'DESC', id: 'DESC' },
        limit: filter.limit + 1,
      });
      const page = rows.slice(0, filter.limit);
      const next = rows.length > filter.limit ? page[page.length - 1] : null;
      return {
        items: page.map(toRecord),
        nextCursor: next ? next.createdAt.toISOString() : null,
      };
    });
  }

  public async updateProcessingStatus(input: {
    readonly id: string;
    readonly status: MediaAssetStatus;
    readonly rejectionReason: string | null;
    readonly processedAt: Date;
  }): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(MediaAssetOrmEntity, { id: input.id });
      if (!entity) {
        return;
      }
      entity.status = input.status;
      entity.rejectionReason = input.rejectionReason;
      entity.processedAt = input.processedAt;
      await tx.flush();
    });
  }
}
