import { describe, expect, it, vi } from 'vitest';
import { CatalogMediaGuardService } from './catalog-media-guard.service';
import { CatalogApplicationError } from '../errors/catalog.errors';

describe('CatalogMediaGuardService', () => {
  it('allows platform admin to attach any media', async () => {
    const guard = new CatalogMediaGuardService(null);
    await expect(
      guard.assertVendorOwnsMedia(
        'vendor-1',
        [{ mediaId: 'm1', mediaType: 'IMAGE', isPrimary: true, sortOrder: 0 }],
        ['PLATFORM_ADMIN'],
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects media owned by another vendor', async () => {
    const guard = new CatalogMediaGuardService({
      findById: vi.fn().mockResolvedValue({
        id: 'm1',
        contentType: 'image/png',
        vendorId: 'other-vendor',
        storeId: null,
      }),
      resolvePublicImageUrl: vi.fn(),
    });
    await expect(
      guard.assertVendorOwnsMedia(
        'vendor-1',
        [{ mediaId: 'm1', mediaType: 'IMAGE', isPrimary: true, sortOrder: 0 }],
        ['VENDOR_OWNER'],
      ),
    ).rejects.toMatchObject({ code: 'MEDIA_OWNERSHIP_DENIED' });
  });

  it('rejects missing media assets', async () => {
    const guard = new CatalogMediaGuardService({
      findById: vi.fn().mockResolvedValue(null),
      resolvePublicImageUrl: vi.fn(),
    });
    await expect(
      guard.assertVendorOwnsMedia('vendor-1', [], ['VENDOR_OWNER']),
    ).resolves.toBeUndefined();
    await expect(
      guard.assertVendorOwnsMedia(
        'vendor-1',
        [{ mediaId: 'missing', mediaType: 'IMAGE', isPrimary: true, sortOrder: 0 }],
        ['VENDOR_OWNER'],
      ),
    ).rejects.toBeInstanceOf(CatalogApplicationError);
  });
});
