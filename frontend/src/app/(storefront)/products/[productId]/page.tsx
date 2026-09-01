import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductMediaGallery } from '@/components/storefront/product-media-gallery';
import { ProductOfferPicker } from '@/components/storefront/product-offer-picker';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbJsonLd, productJsonLd, productMetadata } from '@/lib/seo';
import { fetchPublicProduct, isNotFound } from '@/lib/storefront-api';

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
        <ProductMediaGallery product={product} />
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
            <ProductOfferPicker product={product} />
          </div>
        </div>
      </section>
    </div>
  );
}
