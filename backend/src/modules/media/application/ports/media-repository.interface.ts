import type { MediaAssetRecord, MediaAssetStatus } from '../../domain/media.types';

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');

export type MediaListFilter = {
  readonly limit: number;
  readonly cursor?: string | null;
  readonly status?: MediaAssetStatus | null;
  /** When true (default for admin library), exclude archived unless status=archived. */
  readonly includeArchived?: boolean;
  readonly contentType?: string | null;
  readonly q?: string | null;
  /** platform = vendorId IS NULL; all = no vendor filter */
  readonly scope?: 'platform' | 'all';
};

export type MediaListResult = {
  readonly items: readonly MediaAssetRecord[];
  readonly nextCursor: string | null;
};

export interface MediaRepository {
  save(asset: MediaAssetRecord): Promise<void>;
  findById(id: string): Promise<MediaAssetRecord | null>;
  list(filter: MediaListFilter): Promise<MediaListResult>;
  updateProcessingStatus(input: {
    readonly id: string;
    readonly status: MediaAssetStatus;
    readonly rejectionReason: string | null;
    readonly processedAt: Date;
  }): Promise<void>;
}
