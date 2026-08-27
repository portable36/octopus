import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AddToCartButton } from '@/components/storefront/add-to-cart-button';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbJsonLd, productJsonLd, productMetadata } from '@/lib/seo';
import { fetchPublicProduct, formatMoney, isNotFound } from '@/lib/storefront-api';

export const revalidate = 60;

type Props = {
  readonly params: Promise<{ productId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params;
  try {
    const product = await fetchPublicProduct(productId);
    return productMetadata(product);
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { productId } = await params;

  let product;
  try {
    product = await fetchPublicProduct(productId);
  } catch (error) {
    if (isNotFound(error)) {
      notFound();
    }
    throw error;
  }

  const variantsById = new Map(product.variants.map((v) => [v.id, v]));

  return (
    <div className="space-y-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Search', path: '/search' },
          { name: product.name, path: `/products/${product.id}` },
        ])}
      />
      <JsonLd data={productJsonLd(product)} />
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/search" className="hover:underline">
            Search
          </Link>
          <span aria-hidden="true"> / </span>
          Product
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
        {product.description ? (
          <p className="max-w-2xl text-muted-foreground whitespace-pre-wrap">
            {product.description}
          </p>
        ) : null}
      </header>

      <section className="space-y-3" aria-labelledby="pdp-offers">
        <h2 id="pdp-offers" className="text-lg font-semibold">
          Available offers
        </h2>
        {product.offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active store offers for this product.</p>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {product.offers.map((offer) => {
              const variant = variantsById.get(offer.variantId);
              return (
                <li
                  key={offer.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{variant?.name ?? offer.variantId}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU {variant?.sku ?? '—'} · store{' '}
                      <Link
                        href={`/search?storeId=${encodeURIComponent(offer.storeId)}`}
                        className="underline"
                      >
                        {offer.storeId.slice(0, 8)}…
                      </Link>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="font-medium tabular-nums">
                      {formatMoney(offer.priceMinor, offer.currencyCode)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {offer.isAvailable ? 'Available' : 'Unavailable'}
                    </p>
                    <AddToCartButton
                      storeId={offer.storeId}
                      variantId={offer.variantId}
                      disabled={!offer.isAvailable}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          Offer prices are display snapshots; checkout totals are always server-authoritative.
        </p>
      </section>
    </div>
  );
}
