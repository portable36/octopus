import { Inject, Injectable } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  MediaAccessDeniedError,
  MediaDomainError,
  MediaNotFoundError,
} from '../errors/media.errors';
import { MEDIA_REPOSITORY, type MediaRepository } from '../ports/media-repository.interface';

const MEDIA_WRITE_ROLES = new Set(['PLATFORM_ADMIN', 'VENDOR_OWNER', 'STORE_MANAGER']);
const MEDIA_READ_ROLES = new Set([
  'PLATFORM_ADMIN',
  'VENDOR_OWNER',
  'VENDOR_STAFF',
  'STORE_MANAGER',
  'STORE_STAFF',
]);

@Injectable()
export class MediaHandlers {
  constructor(@Inject(MEDIA_REPOSITORY) private readonly media: MediaRepository) {}

  public async registerMetadata(input: {
    readonly originalFilename: string;
    readonly contentType: string;
    readonly byteSize: number;
    readonly storageKey: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly vendorId: string | null;
    readonly storeId: string | null;
  }) {
    if (!input.actorRoles.some((role) => MEDIA_WRITE_ROLES.has(role))) {
      throw new MediaAccessDeniedError('Missing permission media.write.');
    }
    if (input.byteSize <= 0) {
      throw new MediaDomainError('byteSize must be positive.', 'MEDIA_INVALID_SIZE');
    }
    if (!input.storageKey.trim()) {
      throw new MediaDomainError('storageKey is required.', 'MEDIA_INVALID_KEY');
    }

    const asset = {
      id: UniqueID.create().value,
      originalFilename: input.originalFilename.trim(),
      contentType: input.contentType.trim(),
      byteSize: input.byteSize,
      storageKey: input.storageKey.trim(),
      uploadedBy: input.actorUserId,
      vendorId: input.vendorId,
      storeId: input.storeId,
      createdAt: new Date(),
    };
    await this.media.save(asset);
    return asset;
  }

  public async getById(id: string, actorRoles: readonly string[]) {
    if (!actorRoles.some((role) => MEDIA_READ_ROLES.has(role))) {
      throw new MediaAccessDeniedError('Missing permission media.read.');
    }
    const asset = await this.media.findById(id);
    if (!asset) {
      throw new MediaNotFoundError();
    }
    return asset;
  }
}
