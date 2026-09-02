import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductMediaGallery } from '@/components/storefront/product-media-gallery';
import { ProductOfferPicker } from '@/components/storefront/product-offer-picker';
import { TaxonomyKeywordAttributes } from '@/components/seo/TaxonomyKeywordAttributes';
import { ProductViewAnalytics } from '@/components/storefront/product-view-analytics';
import { StructuredData } from '@/components/seo/StructuredData';
import { buildTaxonomyKeywords } from '@/infrastructure/analytics/taxonomy-keywords';
import { fetchSeoPageContext, isSeoNotFound } from '@/lib/seo-discovery-api';
import { toNextMetadata } from '@/lib/seo-metadata-factory';
import { fetchPublicProduct, isNotFound } from '@/lib/storefront-api';

export const revalidate = 60;

type Props = {
  readonly params: Promise<{ productId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params;
  try {
    const context = await fetchSeoPageContext(`/products/${productId}`);
    return toNextMetadata(context);
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { productId } = await params;

  let product;
  let seoContext;
  try {
    [product, seoContext] = await Promise.all([
      fetchPublicProduct(productId),
      fetchSeoPageContext(`/products/${productId}`),
    ]);
  } catch (error) {
    if (isNotFound(error) || isSeoNotFound(error)) {
      notFound();
    }
    throw error;
  }

  const taxonomyKeywords = buildTaxonomyKeywords({
    productName: product.name,
    categoryNames: product.categoryIds,
    brandName: product.brandId,
  });

  return (
    <div className="space-y-10">
      <TaxonomyKeywordAttributes keywords={taxonomyKeywords} />
      <ProductViewAnalytics
        product={product}
        itemListName="Product Detail"
        itemCategory={product.categoryIds[0]}
      />
      {seoContext.structuredData.map((block, index) => (
        <StructuredData key={`seo-ld-${index}`} data={block} />
      ))}
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
