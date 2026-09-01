import { describe, expect, it, vi } from 'vitest';
import { MediaHandlers } from './media.handlers';

const PNG_PREFIX = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]).toString('base64');

function createHandlers(media = { save: vi.fn(), findById: vi.fn() }) {
  const objectStorage = {
    createPresignedPut: vi.fn(async (input: { storageKey: string }) => ({
      storageKey: input.storageKey,
      uploadUrl: 'https://storage.example/upload',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      requiredHeaders: {
        'Content-Type': 'image/png',
        'Content-Length': '1024',
      },
    })),
  };
  return {
    handlers: new MediaHandlers(media as never, objectStorage as never),
    media,
    objectStorage,
  };
}

describe('MediaHandlers.registerMetadata', () => {
  const base = {
    originalFilename: 'logo.png',
    contentType: 'image/png',
    byteSize: 1024,
    storageKey: 'vendors/v1/logo.png',
    contentPrefixBase64: PNG_PREFIX,
    actorUserId: 'user-1',
    actorRoles: ['PLATFORM_ADMIN'] as const,
    vendorId: null,
    storeId: null,
  };

  it('rejects disallowed content types and oversized payloads', async () => {
    const { handlers, media } = createHandlers();

    await expect(
      handlers.registerMetadata({ ...base, contentType: 'application/pdf' }),
    ).rejects.toMatchObject({ code: 'MEDIA_INVALID_CONTENT_TYPE' });

    await expect(
      handlers.registerMetadata({ ...base, byteSize: 11 * 1024 * 1024 }),
    ).rejects.toMatchObject({ code: 'MEDIA_INVALID_SIZE' });

    expect(media.save).not.toHaveBeenCalled();
  });

  it('rejects URL-like or path-traversal storage keys', async () => {
    const { handlers, media } = createHandlers();

    await expect(
      handlers.registerMetadata({ ...base, storageKey: 'https://evil.example/x' }),
    ).rejects.toMatchObject({ code: 'MEDIA_INVALID_KEY' });

    await expect(
      handlers.registerMetadata({ ...base, storageKey: 'vendors/../secret' }),
    ).rejects.toMatchObject({ code: 'MEDIA_INVALID_KEY' });

    expect(media.save).not.toHaveBeenCalled();
  });

  it('rejects magic mismatch', async () => {
    const { handlers, media } = createHandlers();
    const jpegPrefix = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]).toString(
      'base64',
    );

    await expect(
      handlers.registerMetadata({ ...base, contentPrefixBase64: jpegPrefix }),
    ).rejects.toMatchObject({ code: 'MEDIA_MAGIC_MISMATCH' });

    expect(media.save).not.toHaveBeenCalled();
  });

  it('persists allowed image metadata when magic matches', async () => {
    const media = { save: vi.fn(async (asset: unknown) => asset), findById: vi.fn() };
    const { handlers } = createHandlers(media);

    const asset = await handlers.registerMetadata(base);
    expect(asset.contentType).toBe('image/png');
    expect(media.save).toHaveBeenCalledTimes(1);
  });

  it('rejects vendor register when storage key is outside vendor namespace', async () => {
    const { handlers, media } = createHandlers();

    await expect(
      handlers.registerMetadata({
        ...base,
        vendorId: 'vendor-1',
        storageKey: 'vendors/vendor-2/logo.png',
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_INVALID_KEY' });

    expect(media.save).not.toHaveBeenCalled();
  });
});

describe('MediaHandlers.createUploadSession', () => {
  it('returns a presigned session under the vendor namespace', async () => {
    const { handlers, objectStorage } = createHandlers();

    const session = await handlers.createUploadSession({
      vendorId: 'vendor-1',
      originalFilename: 'hero.png',
      contentType: 'image/png',
      byteSize: 2048,
      actorUserId: 'user-1',
      actorRoles: ['VENDOR_OWNER'],
    });

    expect(session.storageKey).toMatch(/^vendors\/vendor-1\/.+\.png$/);
    expect(session.uploadUrl).toBe('https://storage.example/upload');
    expect(objectStorage.createPresignedPut).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: session.storageKey,
        contentType: 'image/png',
        byteSize: 2048,
      }),
    );
  });
});
