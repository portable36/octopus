import { Inject, Injectable } from '@nestjs/common';
import type {
  MediaAssetAccessPort,
  MediaAssetSnapshot,
  MediaPublicUrlSnapshot,
} from '../../../../shared-kernel/application/ports/media-asset-access.port';
import { MediaHandlers } from '../../application/commands/media.handlers';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../../application/ports/media-repository.interface';

@Injectable()
export class MediaAssetAccessAdapter implements MediaAssetAccessPort {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: MediaRepository,
    @Inject(MediaHandlers) private readonly handlers: MediaHandlers,
  ) {}

  public async findById(mediaId: string): Promise<MediaAssetSnapshot | null> {
    const asset = await this.media.findById(mediaId);
    if (!asset) {
      return null;
    }
    return {
      id: asset.id,
      contentType: asset.contentType,
      vendorId: asset.vendorId,
      storeId: asset.storeId,
    };
  }

  public async resolvePublicImageUrl(mediaId: string): Promise<MediaPublicUrlSnapshot | null> {
    return this.handlers.resolveImageDownloadUrl(mediaId);
  }
}
