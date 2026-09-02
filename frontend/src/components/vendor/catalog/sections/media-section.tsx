'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formClass } from '@/components/vendor/catalog/catalog-styles';
import { normalizeProductMedia, type ProductMediaDraft } from '@/lib/vendor-catalog-flow';
import { updateVendorProduct, type VendorProduct } from '@/lib/vendor-api';
import { getPublicMediaUrl, uploadVendorImage } from '@/lib/vendor-media-upload';

type MediaSectionProps = {
  readonly vendorId: string;
  readonly product: VendorProduct;
  readonly disabled?: boolean;
  readonly onSaved: (product: VendorProduct) => void;
  readonly onError: (message: string) => void;
};

type MediaPreview = {
  mediaId: string;
  url: string | null;
};

export function MediaSection({
  vendorId,
  product,
  disabled = false,
  onSaved,
  onError,
}: MediaSectionProps) {
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<ProductMediaDraft[]>(() =>
    normalizeProductMedia(product.media),
  );
  const [previews, setPreviews] = useState<MediaPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(normalizeProductMedia(product.media));
  }, [product.media]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await Promise.all(
        items.map(async (item) => ({
          mediaId: item.mediaId,
          url: (await getPublicMediaUrl(item.mediaId))?.url ?? null,
        })),
      );
      if (!cancelled) {
        setPreviews(rows);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  function setPrimary(mediaId: string) {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        isPrimary: item.mediaId === mediaId,
      })),
    );
  }

  function removeItem(mediaId: string) {
    setItems((current) => {
      const next = current
        .filter((item) => item.mediaId !== mediaId)
        .map((item, index) => ({ ...item, sortOrder: index }));
      if (next.length > 0 && !next.some((item) => item.isPrimary)) {
        const first = next[0];
        if (first) {
          next[0] = { ...first, isPrimary: true };
        }
      }
      return next;
    });
  }

  function moveItem(mediaId: string, direction: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((item) => item.mediaId === mediaId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      const [row] = next.splice(index, 1);
      if (!row) {
        return current;
      }
      next.splice(target, 0, row);
      return next.map((item, sortOrder) => ({ ...item, sortOrder }));
    });
  }

  async function onUploadSelected(file: File | null) {
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      const asset = await uploadVendorImage(vendorId, file);
      setItems((current) => {
        const next = [
          ...current,
          {
            mediaId: asset.id,
            mediaType: 'IMAGE' as const,
            isPrimary: current.length === 0,
            sortOrder: current.length,
          },
        ];
        return next;
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function onSave() {
    setPending(true);
    try {
      const updated = await updateVendorProduct(product.id, { media: items });
      onSaved(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save media.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={formClass}>
      <div>
        <h3 className="text-sm font-medium">Media</h3>
        <p className="text-sm text-muted-foreground">
          Upload images, set a primary image, and reorder the gallery.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No images attached yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const preview = previews.find((row) => row.mediaId === item.mediaId);
            return (
              <li
                key={item.mediaId}
                className="space-y-2 rounded-md border border-border bg-muted/30 p-3"
              >
                <div className="relative h-32 w-full overflow-hidden rounded-md border border-border bg-muted">
                  {preview?.url ? (
                    <Image
                      src={preview.url}
                      alt="Product media"
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 240px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground font-mono">
                      {item.mediaId}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={item.isPrimary ? 'default' : 'outline'}
                    disabled={disabled || pending || uploading}
                    onClick={() => setPrimary(item.mediaId)}
                  >
                    {item.isPrimary ? 'Primary' : 'Set primary'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled || pending || uploading}
                    onClick={() => moveItem(item.mediaId, -1)}
                  >
                    Up
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled || pending || uploading}
                    onClick={() => moveItem(item.mediaId, 1)}
                  >
                    Down
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled || pending || uploading}
                    onClick={() => removeItem(item.mediaId)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled || pending || uploading}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            void onUploadSelected(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || pending || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Upload image'}
        </Button>
        <Button
          type="button"
          disabled={disabled || pending || uploading}
          onClick={() => void onSave()}
        >
          {pending ? 'Saving…' : 'Save media'}
        </Button>
      </div>
    </div>
  );
}
