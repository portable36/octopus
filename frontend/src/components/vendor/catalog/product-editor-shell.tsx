'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { sectionNavActiveClass, sectionNavClass } from '@/components/vendor/catalog/catalog-styles';
import { GeneralSection } from '@/components/vendor/catalog/sections/general-section';
import { InventorySection } from '@/components/vendor/catalog/sections/inventory-section';
import { MediaSection } from '@/components/vendor/catalog/sections/media-section';
import { PricingSection } from '@/components/vendor/catalog/sections/pricing-section';
import { PublishSection } from '@/components/vendor/catalog/sections/publish-section';
import { cn } from '@/lib/cn';
import {
  loadProductEditorState,
  type ProductEditorSection,
  type ProductEditorState,
} from '@/lib/vendor-catalog-flow';
import type { StockAvailability, StoreOffer, VendorProduct, VendorVariant } from '@/lib/vendor-api';
import { getSelectedStoreId, subscribeSelectedStoreId } from '@/lib/vendor-session';

const SECTIONS: { id: ProductEditorSection; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'media', label: 'Media' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'publish', label: 'Publish' },
];

type ProductEditorShellProps = {
  readonly vendorId: string;
  readonly productId: string;
};

export function ProductEditorShell({ vendorId, productId }: ProductEditorShellProps) {
  const [activeSection, setActiveSection] = useState<ProductEditorSection>('general');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [state, setState] = useState<ProductEditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const activeStoreId = getSelectedStoreId();
    const next = await loadProductEditorState(productId, activeStoreId);
    setState(next);
    setStoreId(activeStoreId);
  }, [productId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await reload();
        if (!cancelled) {
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load product.');
          setState(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return subscribeSelectedStoreId(() => {
      void load();
    });
  }, [reload]);

  function onProductSaved(product: VendorProduct) {
    setState((current) => (current ? { ...current, product } : current));
    setMessage('General details saved.');
    setError(null);
  }

  function onPricingSaved(variants: VendorVariant[], offers: StoreOffer[]) {
    setState((current) => (current ? { ...current, variants, offers } : current));
    setMessage('Pricing saved.');
    setError(null);
  }

  function onMediaSaved(product: VendorProduct) {
    setState((current) => (current ? { ...current, product } : current));
    setMessage('Media saved.');
    setError(null);
  }

  function onInventorySaved(availability: StockAvailability | null) {
    setState((current) => (current ? { ...current, availability } : current));
    setMessage('Inventory saved.');
    setError(null);
  }

  function onPublishSaved(product: VendorProduct) {
    setState((current) => (current ? { ...current, product } : current));
    setMessage('Product status updated.');
    setError(null);
  }

  function onSectionError(sectionMessage: string) {
    if (!sectionMessage) {
      setError(null);
      return;
    }
    setMessage(null);
    setError(sectionMessage);
  }

  if (loading && !state) {
    return <p className="text-sm text-muted-foreground">Loading product editor…</p>;
  }

  if (!state) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive" role="alert">
          {error ?? 'Product not found.'}
        </p>
        <Link
          className="text-sm underline-offset-4 hover:underline"
          href={`/vendor/${vendorId}/catalog`}
        >
          Back to catalog
        </Link>
      </div>
    );
  }

  const needsStore = ['pricing', 'inventory', 'publish'].includes(activeSection);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href={`/vendor/${vendorId}/catalog`}
        >
          ← Catalog
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight">{state.product.name}</h2>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
            {state.product.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground font-mono">{state.product.sku}</p>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      {needsStore && !storeId ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          Select a store in the header to work on pricing, inventory, and publish readiness.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={cn(sectionNavClass, activeSection === section.id && sectionNavActiveClass)}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div>
          {activeSection === 'general' ? (
            <GeneralSection
              product={state.product}
              categories={state.categories}
              onSaved={onProductSaved}
              onError={onSectionError}
            />
          ) : null}
          {activeSection === 'pricing' ? (
            <PricingSection
              product={state.product}
              variants={state.variants}
              offers={state.offers}
              storeId={storeId}
              onSaved={onPricingSaved}
              onError={onSectionError}
            />
          ) : null}
          {activeSection === 'media' ? (
            <MediaSection
              vendorId={vendorId}
              product={state.product}
              onSaved={onMediaSaved}
              onError={onSectionError}
            />
          ) : null}
          {activeSection === 'inventory' ? (
            <InventorySection
              variants={state.variants}
              warehouses={state.warehouses}
              availability={state.availability}
              storeId={storeId}
              onSaved={onInventorySaved}
              onError={onSectionError}
            />
          ) : null}
          {activeSection === 'publish' ? (
            <PublishSection
              product={state.product}
              variants={state.variants}
              offers={state.offers}
              availability={state.availability}
              storeId={storeId}
              onSaved={onPublishSaved}
              onMessage={(text) => {
                setMessage(text);
                setError(null);
              }}
              onError={onSectionError}
            />
          ) : null}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => void reload()}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
