import { describe, expect, it, vi } from 'vitest';
import { MediaHandlers } from './media.handlers';

const PNG_PREFIX = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]).toString('base64');

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
    const media = { save: vi.fn(), findById: vi.fn() };
    const handlers = new MediaHandlers(media as never);

    await expect(
      handlers.registerMetadata({ ...base, contentType: 'application/pdf' }),
    ).rejects.toMatchObject({ code: 'MEDIA_INVALID_CONTENT_TYPE' });

    await expect(
      handlers.registerMetadata({ ...base, byteSize: 11 * 1024 * 1024 }),
    ).rejects.toMatchObject({ code: 'MEDIA_INVALID_SIZE' });

    expect(media.save).not.toHaveBeenCalled();
  });

  it('rejects URL-like or path-traversal storage keys', async () => {
    const media = { save: vi.fn(), findById: vi.fn() };
    const handlers = new MediaHandlers(media as never);

    await expect(
      handlers.registerMetadata({ ...base, storageKey: 'https://evil.example/x' }),
    ).rejects.toMatchObject({ code: 'MEDIA_INVALID_KEY' });

    await expect(
      handlers.registerMetadata({ ...base, storageKey: 'vendors/../secret' }),
    ).rejects.toMatchObject({ code: 'MEDIA_INVALID_KEY' });
  });

  it('rejects magic mismatch', async () => {
    const media = { save: vi.fn(), findById: vi.fn() };
    const handlers = new MediaHandlers(media as never);
    const jpegPrefix = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]).toString(
      'base64',
    );

    await expect(
      handlers.registerMetadata({ ...base, contentPrefixBase64: jpegPrefix }),
    ).rejects.toMatchObject({ code: 'MEDIA_MAGIC_MISMATCH' });
  });

  it('persists allowed image metadata when magic matches', async () => {
    const media = { save: vi.fn(async (asset: unknown) => asset), findById: vi.fn() };
    const handlers = new MediaHandlers(media as never);

    const asset = await handlers.registerMetadata(base);
    expect(asset.contentType).toBe('image/png');
    expect(media.save).toHaveBeenCalledTimes(1);
  });
});
