import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import type {
  MediaAssetAccessPort,
  MediaAssetSnapshot,
  MediaPublicUrlSnapshot,
} from '../../../../shared-kernel/application/ports/media-asset-access.port';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../../application/ports/media-repository.interface';

@Injectable()
export class MediaAssetAccessAdapter implements MediaAssetAccessPort {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: MediaRepository,
    @Inject(AppConfigService) private readonly config: AppConfigService,
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
    const asset = await this.media.findById(mediaId);
    if (!asset || !asset.contentType.startsWith('image/')) {
      return null;
    }
    const base = this.config.mediaPublicBaseUrl.replace(/\/$/, '');
    const key = asset.storageKey.replace(/^\//, '');
    return {
      id: asset.id,
      contentType: asset.contentType,
      url: `${base}/${key}`,
    };
  }
}
