'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { fieldClass, formClass, labelClass } from '@/components/vendor/catalog/catalog-styles';
import {
  DRAFT_PRODUCT_NAME,
  getDefaultVariant,
  isOfferActive,
  isVariantActive,
} from '@/lib/vendor-catalog-flow';
import {
  activateStoreOffer,
  activateVariant,
  createProductVariant,
  createStoreOffer,
  formatVendorMoney,
  updateStoreOfferPrice,
  type StoreOffer,
  type VendorProduct,
  type VendorVariant,
} from '@/lib/vendor-api';

type PricingSectionProps = {
  readonly product: VendorProduct;
  readonly variants: readonly VendorVariant[];
  readonly offers: readonly StoreOffer[];
  readonly storeId: string | null;
  readonly disabled?: boolean;
  readonly onSaved: (variants: VendorVariant[], offers: StoreOffer[]) => void;
  readonly onError: (message: string) => void;
};

export function PricingSection({
  product,
  variants,
  offers,
  storeId,
  disabled = false,
  onSaved,
  onError,
}: PricingSectionProps) {
  const defaultVariant = getDefaultVariant(variants);
  const storeOffer =
    defaultVariant != null
      ? offers.find((offer) => offer.variantId === defaultVariant.id)
      : undefined;

  const [pending, setPending] = useState(false);
  const [variantSku, setVariantSku] = useState(defaultVariant?.sku ?? product.sku);
  const [variantName, setVariantName] = useState(
    defaultVariant?.name ?? (product.name === DRAFT_PRODUCT_NAME ? 'Default' : product.name),
  );
  const [basePriceMinor, setBasePriceMinor] = useState(
    defaultVariant?.basePriceMinor != null ? String(defaultVariant.basePriceMinor) : '',
  );
  const [storePriceMinor, setStorePriceMinor] = useState(
    storeOffer != null ? String(storeOffer.priceMinor) : '',
  );
  const [currencyCode, setCurrencyCode] = useState(
    storeOffer?.currencyCode ?? defaultVariant?.currencyCode ?? 'BDT',
  );

  useEffect(() => {
    const variant = getDefaultVariant(variants);
    const offer = variant != null ? offers.find((row) => row.variantId === variant.id) : undefined;
    setVariantSku(variant?.sku ?? product.sku);
    setVariantName(
      variant?.name ?? (product.name === DRAFT_PRODUCT_NAME ? 'Default' : product.name),
    );
    setBasePriceMinor(variant?.basePriceMinor != null ? String(variant.basePriceMinor) : '');
    setStorePriceMinor(offer != null ? String(offer.priceMinor) : '');
    setCurrencyCode(offer?.currencyCode ?? variant?.currencyCode ?? 'BDT');
  }, [variants, offers, product.name, product.sku]);

  if (!storeId) {
    return (
      <div className={formClass}>
        <h3 className="text-sm font-medium">Pricing</h3>
        <p className="text-sm text-muted-foreground">
          Select a store in the header before setting variant and store price.
        </p>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId) {
      onError('Select a store in the header before saving pricing.');
      return;
    }
    const activeStoreId = storeId;
    const priceMinor = Number.parseInt(storePriceMinor, 10);
    const catalogBaseMinor = basePriceMinor ? Number.parseInt(basePriceMinor, 10) : undefined;
    if (!Number.isFinite(priceMinor) || priceMinor < 0) {
      onError('Store price must be a non-negative number in minor units.');
      return;
    }

    setPending(true);
    try {
      let variant = defaultVariant;
      if (!variant) {
        variant = await createProductVariant(product.id, {
          name: variantName.trim(),
          sku: variantSku.trim(),
          ...(catalogBaseMinor != null && Number.isFinite(catalogBaseMinor)
            ? { basePriceMinor: catalogBaseMinor, currencyCode: currencyCode.trim() || 'BDT' }
            : {}),
        });
      }

      if (!isVariantActive(variant.status)) {
        variant = await activateVariant(variant.id);
      }

      let offer = offers.find((row) => row.variantId === variant.id);
      if (!offer) {
        offer = await createStoreOffer({
          storeId: activeStoreId,
          variantId: variant.id,
          priceMinor,
          currencyCode: currencyCode.trim() || 'BDT',
        });
      } else {
        offer = await updateStoreOfferPrice(offer.id, {
          priceMinor,
          currencyCode: currencyCode.trim() || 'BDT',
        });
      }

      if (!isOfferActive(offer)) {
        offer = await activateStoreOffer(offer.id);
      }

      const nextVariants =
        variant.id === defaultVariant?.id
          ? variants.map((row) => (row.id === variant.id ? variant : row))
          : [...variants, variant];
      const nextOffers = offers.some((row) => row.id === offer.id)
        ? offers.map((row) => (row.id === offer.id ? offer : row))
        : [...offers, offer];

      onSaved(nextVariants, nextOffers);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save pricing.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={formClass} onSubmit={onSubmit}>
      <div>
        <h3 className="text-sm font-medium">Pricing</h3>
        <p className="text-sm text-muted-foreground">
          Simple product: one default variant and a store price for the selected store.
        </p>
      </div>

      {defaultVariant ? (
        <p className="text-sm text-muted-foreground">
          Variant status: {defaultVariant.status}
          {storeOffer
            ? ` · Store offer: ${formatVendorMoney(storeOffer.priceMinor, storeOffer.currencyCode)} (${storeOffer.status})`
            : ' · No store offer yet'}
        </p>
      ) : null}

      <label className={labelClass}>
        Variant name
        <input
          className={fieldClass}
          value={variantName}
          onChange={(event) => setVariantName(event.target.value)}
          required
          disabled={disabled || pending || defaultVariant != null}
        />
      </label>
      <label className={labelClass}>
        Variant SKU
        <input
          className={fieldClass}
          value={variantSku}
          onChange={(event) => setVariantSku(event.target.value)}
          required
          minLength={3}
          disabled={disabled || pending || defaultVariant != null}
        />
      </label>
      <label className={labelClass}>
        Catalog base price (minor units, optional)
        <input
          className={fieldClass}
          type="number"
          min={0}
          step={1}
          value={basePriceMinor}
          onChange={(event) => setBasePriceMinor(event.target.value)}
          disabled={disabled || pending}
        />
      </label>
      <label className={labelClass}>
        Store price (minor units)
        <input
          className={fieldClass}
          type="number"
          min={0}
          step={1}
          value={storePriceMinor}
          onChange={(event) => setStorePriceMinor(event.target.value)}
          required
          disabled={disabled || pending}
        />
      </label>
      <label className={labelClass}>
        Currency
        <input
          className={fieldClass}
          value={currencyCode}
          onChange={(event) => setCurrencyCode(event.target.value)}
          maxLength={3}
          required
          disabled={disabled || pending}
        />
      </label>
      <Button type="submit" disabled={disabled || pending}>
        {pending ? 'Saving…' : 'Save pricing'}
      </Button>
    </form>
  );
}
