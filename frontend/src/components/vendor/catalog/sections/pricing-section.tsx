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
  const [barcode, setBarcode] = useState(defaultVariant?.barcode ?? '');
  const [weightGrams, setWeightGrams] = useState(
    defaultVariant?.weightGrams != null ? String(defaultVariant.weightGrams) : '',
  );
  const [lengthMm, setLengthMm] = useState(
    defaultVariant?.dimensions?.lengthMillimeters != null
      ? String(defaultVariant.dimensions.lengthMillimeters)
      : '',
  );
  const [widthMm, setWidthMm] = useState(
    defaultVariant?.dimensions?.widthMillimeters != null
      ? String(defaultVariant.dimensions.widthMillimeters)
      : '',
  );
  const [heightMm, setHeightMm] = useState(
    defaultVariant?.dimensions?.heightMillimeters != null
      ? String(defaultVariant.dimensions.heightMillimeters)
      : '',
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
    setBarcode(variant?.barcode ?? '');
    setWeightGrams(variant?.weightGrams != null ? String(variant.weightGrams) : '');
    setLengthMm(
      variant?.dimensions?.lengthMillimeters != null
        ? String(variant.dimensions.lengthMillimeters)
        : '',
    );
    setWidthMm(
      variant?.dimensions?.widthMillimeters != null
        ? String(variant.dimensions.widthMillimeters)
        : '',
    );
    setHeightMm(
      variant?.dimensions?.heightMillimeters != null
        ? String(variant.dimensions.heightMillimeters)
        : '',
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
        const parsedWeight = weightGrams ? Number.parseInt(weightGrams, 10) : undefined;
        const parsedLength = lengthMm ? Number.parseInt(lengthMm, 10) : undefined;
        const parsedWidth = widthMm ? Number.parseInt(widthMm, 10) : undefined;
        const parsedHeight = heightMm ? Number.parseInt(heightMm, 10) : undefined;
        const dimensions =
          parsedLength != null &&
          parsedWidth != null &&
          parsedHeight != null &&
          Number.isFinite(parsedLength) &&
          Number.isFinite(parsedWidth) &&
          Number.isFinite(parsedHeight)
            ? {
                lengthMillimeters: parsedLength,
                widthMillimeters: parsedWidth,
                heightMillimeters: parsedHeight,
              }
            : undefined;

        variant = await createProductVariant(product.id, {
          name: variantName.trim(),
          sku: variantSku.trim(),
          ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
          ...(parsedWeight != null && Number.isFinite(parsedWeight)
            ? { weightGrams: parsedWeight }
            : {}),
          ...(dimensions ? { dimensions } : {}),
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
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            Variant status: {defaultVariant.status}
            {storeOffer
              ? ` · Store offer: ${formatVendorMoney(storeOffer.priceMinor, storeOffer.currencyCode)} (${storeOffer.status})`
              : ' · No store offer yet'}
          </p>
          {(defaultVariant.barcode || defaultVariant.weightGrams || defaultVariant.dimensions) && (
            <p className="text-xs">
              {defaultVariant.barcode ? `Barcode: ${defaultVariant.barcode} ` : ''}
              {defaultVariant.weightGrams ? `· Weight: ${defaultVariant.weightGrams}g ` : ''}
              {defaultVariant.dimensions
                ? `· Dimensions: ${defaultVariant.dimensions.lengthMillimeters}×${defaultVariant.dimensions.widthMillimeters}×${defaultVariant.dimensions.heightMillimeters} mm`
                : ''}
            </p>
          )}
        </div>
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
        Barcode (optional)
        <input
          className={fieldClass}
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          placeholder="e.g. 8901234567890"
          disabled={disabled || pending || defaultVariant != null}
        />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className={labelClass}>
          Weight (grams)
          <input
            className={fieldClass}
            type="number"
            min={0}
            step={1}
            value={weightGrams}
            onChange={(event) => setWeightGrams(event.target.value)}
            placeholder="e.g. 500"
            disabled={disabled || pending || defaultVariant != null}
          />
        </label>
        <label className={labelClass}>
          Length (mm)
          <input
            className={fieldClass}
            type="number"
            min={0}
            step={1}
            value={lengthMm}
            onChange={(event) => setLengthMm(event.target.value)}
            placeholder="e.g. 100"
            disabled={disabled || pending || defaultVariant != null}
          />
        </label>
        <label className={labelClass}>
          Width (mm)
          <input
            className={fieldClass}
            type="number"
            min={0}
            step={1}
            value={widthMm}
            onChange={(event) => setWidthMm(event.target.value)}
            placeholder="e.g. 50"
            disabled={disabled || pending || defaultVariant != null}
          />
        </label>
        <label className={labelClass}>
          Height (mm)
          <input
            className={fieldClass}
            type="number"
            min={0}
            step={1}
            value={heightMm}
            onChange={(event) => setHeightMm(event.target.value)}
            placeholder="e.g. 25"
            disabled={disabled || pending || defaultVariant != null}
          />
        </label>
      </div>
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
