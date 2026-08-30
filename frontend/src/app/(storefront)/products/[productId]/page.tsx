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
    <div className="space-y-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Search', path: '/search' },
          { name: product.name, path: `/products/${product.id}` },
        ])}
      />
      <JsonLd data={productJsonLd(product)} />
      <header className="space-y-3">
        <p className="sf-breadcrumb">
          <Link href="/search" className="hover:underline">
            Search
          </Link>
          <span aria-hidden="true"> / </span>
          Product
        </p>
      </header>

      <section className="sf-product-layout" aria-labelledby="product-title">
        <div className="sf-product-stage" aria-label={`${product.name} product image placeholder`}>
          <span className="sf-product-stage-label">Product</span>
          {product.name.trim().charAt(0).toUpperCase() || 'O'}
        </div>
        <div className="sf-product-details">
          <div className="space-y-3">
            <p className="sf-eyebrow">Product</p>
            <h1 id="product-title" className="text-4xl font-semibold tracking-tight md:text-5xl">
              {product.name}
            </h1>
            <div className="sf-disclosures">
              <details open>
                <summary>Product details</summary>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {product.description ?? 'Product details will be updated by the store.'}
                </p>
              </details>
              <details>
                <summary>Delivery and returns</summary>
                <p className="text-muted-foreground">
                  Delivery options, availability, and the final total are confirmed at checkout.
                  Review the order details before placing your order.
                </p>
              </details>
            </div>
          </div>
          <div className="sf-panel space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Choose a store offer</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Prices shown here are snapshots. Checkout confirms the final total and availability.
              </p>
            </div>
            {product.offers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active store offers for this product.
              </p>
            ) : (
              <ul className="sf-offer-list">
                {product.offers.map((offer) => {
                  const variant = variantsById.get(offer.variantId);
                  return (
                    <li key={offer.id} className="sf-offer-row">
                      <div>
                        <p className="font-semibold text-foreground">
                          {variant?.name ?? offer.variantId}
                        </p>
                        <p>
                          SKU {variant?.sku ?? '—'} ·{' '}
                          <Link
                            href={`/search?storeId=${encodeURIComponent(offer.storeId)}`}
                            className="underline underline-offset-4"
                          >
                            View store
                          </Link>
                        </p>
                        <p className={offer.isAvailable ? 'sf-stock-ok' : 'sf-stock-out'}>
                          {offer.isAvailable ? 'Available now' : 'Currently unavailable'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="sf-price tabular-nums">
                          {formatMoney(offer.priceMinor, offer.currencyCode)}
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
          </div>
        </div>
      </section>
    </div>
  );
}
