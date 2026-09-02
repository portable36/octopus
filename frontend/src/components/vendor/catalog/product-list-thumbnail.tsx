'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getPrimaryMedia } from '@/lib/vendor-catalog-flow';
import type { VendorProduct } from '@/lib/vendor-api';
import { getPublicMediaUrl } from '@/lib/vendor-media-upload';

export function ProductListThumbnail({ product }: { readonly product: VendorProduct }) {
  const primary = getPrimaryMedia(product.media);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!primary) {
      setUrl(null);
      return;
    }
    void (async () => {
      const snapshot = await getPublicMediaUrl(primary.mediaId);
      if (!cancelled) {
        setUrl(snapshot?.url ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [primary]);

  if (!url) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-[10px] text-muted-foreground">
        —
      </div>
    );
  }

  return (
    <div className="relative h-10 w-10 overflow-hidden rounded-md border border-border bg-muted">
      <Image src={url} alt="" fill className="object-cover" sizes="40px" unoptimized />
    </div>
  );
}
