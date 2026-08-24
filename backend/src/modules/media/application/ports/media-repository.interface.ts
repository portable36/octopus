import type { MediaAssetRecord } from '../../domain/media.types';

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');

export interface MediaRepository {
  save(asset: MediaAssetRecord): Promise<void>;
  findById(id: string): Promise<MediaAssetRecord | null>;
}
