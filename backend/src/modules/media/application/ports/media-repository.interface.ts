import type { MediaAssetRecord, MediaAssetStatus } from '../../domain/media.types';

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');

export interface MediaRepository {
  save(asset: MediaAssetRecord): Promise<void>;
  findById(id: string): Promise<MediaAssetRecord | null>;
  updateProcessingStatus(input: {
    readonly id: string;
    readonly status: MediaAssetStatus;
    readonly rejectionReason: string | null;
    readonly processedAt: Date;
  }): Promise<void>;
}
