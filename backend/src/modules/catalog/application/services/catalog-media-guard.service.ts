import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  MEDIA_ASSET_ACCESS,
  type MediaAssetAccessPort,
} from '../../../../shared-kernel/application/ports/media-asset-access.port';
import type { CatalogMediaReference } from '../../domain/catalog.types';
import { CatalogApplicationError } from '../errors/catalog.errors';

@Injectable()
export class CatalogMediaGuardService {
  constructor(
    @Optional()
    @Inject(MEDIA_ASSET_ACCESS)
    private readonly mediaAccess: MediaAssetAccessPort | null = null,
  ) {}

  public async assertVendorOwnsMedia(
    vendorId: string,
    media: readonly CatalogMediaReference[],
    actorRoles: readonly string[],
  ): Promise<void> {
    if (media.length === 0) {
      return;
    }
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return;
    }
    if (!this.mediaAccess) {
      throw new CatalogApplicationError(
        'Media ownership validation is unavailable.',
        'MEDIA_GUARD_UNAVAILABLE',
      );
    }
    for (const item of media) {
      const asset = await this.mediaAccess.findById(item.mediaId);
      if (!asset) {
        throw new CatalogApplicationError(
          `Media asset not found: ${item.mediaId}`,
          'MEDIA_NOT_FOUND',
        );
      }
      if (asset.vendorId !== vendorId) {
        throw new CatalogApplicationError(
          'Media asset does not belong to this vendor.',
          'MEDIA_OWNERSHIP_DENIED',
        );
      }
    }
  }
}
