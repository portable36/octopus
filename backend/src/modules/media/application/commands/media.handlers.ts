import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  decodeContentPrefixBase64,
  sniffImageContentType,
} from '../../domain/services/sniff-image-content-type';
import {
  MediaAccessDeniedError,
  MediaDomainError,
  MediaNotFoundError,
} from '../errors/media.errors';
import { OBJECT_STORAGE, type ObjectStoragePort } from '../ports/object-storage.port';
import { MEDIA_REPOSITORY, type MediaRepository } from '../ports/media-repository.interface';

const MEDIA_WRITE_ROLES = new Set(['PLATFORM_ADMIN', 'VENDOR_OWNER', 'STORE_MANAGER']);
const MEDIA_READ_ROLES = new Set([
  'PLATFORM_ADMIN',
  'VENDOR_OWNER',
  'VENDOR_STAFF',
  'STORE_MANAGER',
  'STORE_STAFF',
]);

export const MEDIA_ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;

export const MEDIA_UPLOAD_SESSION_TTL_SECONDS = 15 * 60;

const CONTENT_TYPE_EXTENSION: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function assertSafeStorageKey(storageKey: string): void {
  const key = storageKey.trim();
  if (!key) {
    throw new MediaDomainError('storageKey is required.', 'MEDIA_INVALID_KEY');
  }
  if (key.includes('..') || key.includes('\\') || key.includes('\0')) {
    throw new MediaDomainError('storageKey path is invalid.', 'MEDIA_INVALID_KEY');
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(key)) {
    throw new MediaDomainError('storageKey must be an object key, not a URL.', 'MEDIA_INVALID_KEY');
  }
}

function assertVendorStorageKey(vendorId: string, storageKey: string): void {
  const expectedPrefix = `vendors/${vendorId}/`;
  if (!storageKey.startsWith(expectedPrefix)) {
    throw new MediaDomainError(
      'storageKey must belong to the vendor upload namespace.',
      'MEDIA_INVALID_KEY',
    );
  }
}

function extensionForContentType(contentType: string): string {
  const normalized = contentType.trim().toLowerCase();
  const extension = CONTENT_TYPE_EXTENSION[normalized];
  if (!extension) {
    throw new MediaDomainError(
      `contentType not allowed: ${normalized}`,
      'MEDIA_INVALID_CONTENT_TYPE',
    );
  }
  return extension;
}

function assertAllowedMediaMetadata(contentType: string, byteSize: number): void {
  const normalized = contentType.trim().toLowerCase();
  if (!MEDIA_ALLOWED_CONTENT_TYPES.has(normalized)) {
    throw new MediaDomainError(
      `contentType not allowed: ${normalized}`,
      'MEDIA_INVALID_CONTENT_TYPE',
    );
  }
  if (byteSize <= 0) {
    throw new MediaDomainError('byteSize must be positive.', 'MEDIA_INVALID_SIZE');
  }
  if (byteSize > MEDIA_MAX_BYTES) {
    throw new MediaDomainError(`byteSize exceeds ${MEDIA_MAX_BYTES} bytes.`, 'MEDIA_INVALID_SIZE');
  }
}

function assertMagicMatchesDeclared(contentType: string, contentPrefixBase64: string): void {
  let prefix: Buffer;
  try {
    prefix = decodeContentPrefixBase64(contentPrefixBase64);
  } catch (error) {
    throw new MediaDomainError(
      error instanceof Error ? error.message : 'Invalid content prefix.',
      'MEDIA_INVALID_PREFIX',
    );
  }
  const sniffed = sniffImageContentType(prefix);
  const declared = contentType.trim().toLowerCase();
  if (!sniffed || sniffed !== declared) {
    throw new MediaDomainError(
      'File header does not match declared contentType.',
      'MEDIA_MAGIC_MISMATCH',
    );
  }
}

@Injectable()
export class MediaHandlers {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: MediaRepository,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStoragePort,
    @Optional() @Inject(AUDIT_PORT) private readonly audit: AuditPort | null = null,
  ) {}

  public async createUploadSession(input: {
    readonly vendorId: string;
    readonly originalFilename: string;
    readonly contentType: string;
    readonly byteSize: number;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }) {
    if (!input.actorRoles.some((role) => MEDIA_WRITE_ROLES.has(role))) {
      throw new MediaAccessDeniedError('Missing permission media.write.');
    }
    assertAllowedMediaMetadata(input.contentType, input.byteSize);

    const extension = extensionForContentType(input.contentType);
    const objectId = UniqueID.create().value;
    const storageKey = `vendors/${input.vendorId}/${objectId}.${extension}`;
    assertSafeStorageKey(storageKey);

    const session = await this.objectStorage.createPresignedPut({
      storageKey,
      contentType: input.contentType.trim().toLowerCase(),
      byteSize: input.byteSize,
      expiresInSeconds: MEDIA_UPLOAD_SESSION_TTL_SECONDS,
    });

    return {
      storageKey: session.storageKey,
      uploadUrl: session.uploadUrl,
      expiresAt: session.expiresAt.toISOString(),
      requiredHeaders: session.requiredHeaders,
      originalFilename: input.originalFilename.trim(),
      contentType: input.contentType.trim().toLowerCase(),
      byteSize: input.byteSize,
    };
  }

  public async registerMetadata(input: {
    readonly originalFilename: string;
    readonly contentType: string;
    readonly byteSize: number;
    readonly storageKey: string;
    readonly contentPrefixBase64: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly vendorId: string | null;
    readonly storeId: string | null;
  }) {
    if (!input.actorRoles.some((role) => MEDIA_WRITE_ROLES.has(role))) {
      throw new MediaAccessDeniedError('Missing permission media.write.');
    }
    assertAllowedMediaMetadata(input.contentType, input.byteSize);
    assertSafeStorageKey(input.storageKey);
    if (input.vendorId) {
      assertVendorStorageKey(input.vendorId, input.storageKey);
    }
    assertMagicMatchesDeclared(input.contentType, input.contentPrefixBase64);

    const asset = {
      id: UniqueID.create().value,
      originalFilename: input.originalFilename.trim(),
      contentType: input.contentType.trim().toLowerCase(),
      byteSize: input.byteSize,
      storageKey: input.storageKey.trim(),
      uploadedBy: input.actorUserId,
      vendorId: input.vendorId,
      storeId: input.storeId,
      createdAt: new Date(),
    };
    await this.media.save(asset);
    await this.audit?.append({
      actorUserId: input.actorUserId,
      action: 'media.registered',
      resourceType: 'media_asset',
      resourceId: asset.id,
      vendorId: asset.vendorId,
      storeId: asset.storeId,
      after: {
        originalFilename: asset.originalFilename,
        contentType: asset.contentType,
        byteSize: asset.byteSize,
        storageKey: asset.storageKey,
      },
    });
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
