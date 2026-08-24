import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { MediaRepository } from '../../application/ports/media-repository.interface';
import type { MediaAssetRecord } from '../../domain/media.types';
import { MediaAssetOrmEntity } from './media-asset.orm-entity';

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
      return {
        id: entity.id,
        originalFilename: entity.originalFilename,
        contentType: entity.contentType,
        byteSize: entity.byteSize,
        storageKey: entity.storageKey,
        uploadedBy: entity.uploadedBy,
        vendorId: entity.vendorId,
        storeId: entity.storeId,
        createdAt: entity.createdAt,
      };
    });
  }
}
