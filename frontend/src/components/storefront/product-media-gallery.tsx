import Image from 'next/image';
import type { PublicProduct } from '@/lib/storefront-api';

function primaryImage(product: PublicProduct): string | null {
  const primary = product.media.find((item) => item.isPrimary && item.url);
  if (primary?.url) {
    return primary.url;
  }
  const first = product.media.find((item) => item.url);
  return first?.url ?? null;
}

export function ProductMediaGallery({ product }: { readonly product: PublicProduct }) {
  const hero = primaryImage(product);
  const gallery = product.media.filter((item) => item.url);

  if (!hero) {
    return (
      <div className="sf-product-stage" aria-label={`${product.name} product image placeholder`}>
        <span className="sf-product-stage-label">Product</span>
        {product.name.trim().charAt(0).toUpperCase() || 'O'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="sf-product-stage relative overflow-hidden p-0">
        <Image
          src={hero}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
      {gallery.length > 1 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Product image gallery">
          {gallery.map((item) => (
            <li key={item.mediaId}>
              {item.url ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                  <Image src={item.url} alt="" fill className="object-cover" sizes="64px" />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
