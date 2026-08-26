'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  activateStoreOffer,
  activateVariant,
  archiveProduct,
  archiveVariant,
  createProductVariant,
  createStoreOffer,
  formatVendorMoney,
  getVendorProduct,
  publishProduct,
  submitProductReview,
  suspendStoreOffer,
  unpublishProduct,
  updateStoreOfferPrice,
  type StoreOffer,
  type VendorProduct,
} from '@/lib/vendor-api';
import { getSelectedStoreId, subscribeSelectedStoreId } from '@/lib/vendor-session';

const fieldClass = 'h-10 rounded-md border border-border bg-background px-3';
const labelClass = 'flex flex-col gap-1 text-sm';
const formClass = 'max-w-lg space-y-3 rounded-md border border-border bg-background p-4';

function formString(form: FormData, name: string): string {
  return String(form.get(name) || '').trim();
}

function formInt(form: FormData, name: string): number {
  return Number.parseInt(String(form.get(name) || ''), 10);
}

export default function VendorProductDetailPage() {
  const params = useParams<{ vendorId: string; productId: string }>();
  const { vendorId, productId } = params;
  const [product, setProduct] = useState<VendorProduct | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [lastOffer, setLastOffer] = useState<StoreOffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const sync = () => setStoreId(getSelectedStoreId());
    sync();
    return subscribeSelectedStoreId(sync);
  }, []);

  const reload = useCallback(async () => {
    const row = await getVendorProduct(productId);
    setProduct(row);
  }, [productId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
        if (!cancelled) {
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load product.');
          setProduct(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function runMutation(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Request failed.');
    } finally {
      setPending(false);
    }
  }

  async function onLifecycle(action: (id: string) => Promise<VendorProduct>, okMessage: string) {
    await runMutation(async () => {
      const updated = await action(productId);
      setProduct(updated);
      setMessage(okMessage);
    });
  }

  async function onCreateVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const el = event.currentTarget;
    const form = new FormData(el);
    const barcode = formString(form, 'barcode');
    const priceRaw = formString(form, 'basePriceMinor');
    const currencyCode = formString(form, 'currencyCode') || 'BDT';
    await runMutation(async () => {
      await createProductVariant(productId, {
        name: formString(form, 'name'),
        sku: formString(form, 'sku'),
        ...(barcode ? { barcode } : {}),
        ...(priceRaw ? { basePriceMinor: Number.parseInt(priceRaw, 10), currencyCode } : {}),
      });
      await reload();
      setMessage('Variant created.');
      el.reset();
    });
  }

  async function onCreateOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId) {
      setError('Select a store in the header to create an offer.');
      return;
    }
    const el = event.currentTarget;
    const form = new FormData(el);
    const activeStoreId = storeId;
    await runMutation(async () => {
      const offer = await createStoreOffer({
        storeId: activeStoreId,
        variantId: formString(form, 'variantId'),
        priceMinor: formInt(form, 'priceMinor'),
        currencyCode: formString(form, 'currencyCode') || 'BDT',
      });
      setLastOffer(offer);
      setMessage('Store offer created.');
      el.reset();
    });
  }

  async function onUpdateOfferPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lastOffer) {
      return;
    }
    const form = new FormData(event.currentTarget);
    const currencyCode = formString(form, 'currencyCode');
    await runMutation(async () => {
      const offer = await updateStoreOfferPrice(lastOffer.id, {
        priceMinor: formInt(form, 'priceMinor'),
        ...(currencyCode ? { currencyCode } : {}),
      });
      setLastOffer(offer);
      setMessage('Offer price updated.');
    });
  }

  if (!product && !error) {
    return <p className="text-sm text-muted-foreground">Loading product…</p>;
  }

  if (!product) {
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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href={`/vendor/${vendorId}/catalog`}
        >
          ← Catalog
        </Link>
        <h2 className="text-xl font-semibold tracking-tight">{product.name}</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-xs">{product.sku}</span>
          {' · '}
          {product.status}
        </p>
        {product.description ? <p className="text-sm">{product.description}</p> : null}
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Lifecycle</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => void onLifecycle(submitProductReview, 'Submitted for review.')}
          >
            Submit review
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => void onLifecycle(publishProduct, 'Published.')}
          >
            Publish
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => void onLifecycle(unpublishProduct, 'Unpublished.')}
          >
            Unpublish
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => void onLifecycle(archiveProduct, 'Archived.')}
          >
            Archive
          </Button>
        </div>
      </section>

      <form className={formClass} onSubmit={onCreateVariant}>
        <h3 className="text-sm font-medium">Create variant</h3>
        <label className={labelClass}>
          Name
          <input className={fieldClass} name="name" required disabled={pending} />
        </label>
        <label className={labelClass}>
          SKU
          <input className={fieldClass} name="sku" required disabled={pending} />
        </label>
        <label className={labelClass}>
          Base price (minor units)
          <input
            className={fieldClass}
            name="basePriceMinor"
            type="number"
            min={0}
            step={1}
            disabled={pending}
          />
        </label>
        <label className={labelClass}>
          Currency
          <input
            className={fieldClass}
            name="currencyCode"
            defaultValue="BDT"
            maxLength={3}
            disabled={pending}
          />
        </label>
        <label className={labelClass}>
          Barcode (optional)
          <input className={fieldClass} name="barcode" disabled={pending} />
        </label>
        <Button type="submit" disabled={pending}>
          Create variant
        </Button>
      </form>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Variants</h3>
        {product.variantIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No variants yet.</p>
        ) : (
          <ul className="space-y-2">
            {product.variantIds.map((variantId) => (
              <li
                key={variantId}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs">{variantId}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    void runMutation(async () => {
                      await activateVariant(variantId);
                      setMessage(`Variant ${variantId} activated.`);
                    })
                  }
                >
                  Activate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    void runMutation(async () => {
                      await archiveVariant(variantId);
                      setMessage(`Variant ${variantId} archived.`);
                    })
                  }
                >
                  Archive
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Store offer</h3>
        {!storeId ? (
          <p className="text-sm text-muted-foreground">
            Select a store in the header to create offers.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Selected store: <span className="font-mono text-xs">{storeId}</span>
          </p>
        )}
        {/* ponytail: no list-offers-by-store API — show last created response only */}
        <form className={formClass} onSubmit={onCreateOffer}>
          <label className={labelClass}>
            Variant ID
            <input
              className={fieldClass}
              name="variantId"
              required
              list="product-variant-ids"
              disabled={pending || !storeId}
            />
            <datalist id="product-variant-ids">
              {product.variantIds.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </label>
          <label className={labelClass}>
            Price (minor units)
            <input
              className={fieldClass}
              name="priceMinor"
              type="number"
              min={0}
              step={1}
              required
              disabled={pending || !storeId}
            />
          </label>
          <label className={labelClass}>
            Currency
            <input
              className={fieldClass}
              name="currencyCode"
              defaultValue="BDT"
              maxLength={3}
              disabled={pending || !storeId}
            />
          </label>
          <Button type="submit" disabled={pending || !storeId}>
            Create offer
          </Button>
        </form>

        {lastOffer ? (
          <div className="max-w-lg space-y-3 rounded-md border border-border bg-background p-4 text-sm">
            <p>
              Last offer: <span className="font-mono text-xs">{lastOffer.id}</span>
              {' · '}
              {formatVendorMoney(lastOffer.priceMinor, lastOffer.currencyCode)}
              {' · '}
              {lastOffer.status}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  void runMutation(async () => {
                    const offer = await activateStoreOffer(lastOffer.id);
                    setLastOffer(offer);
                    setMessage('Offer activated.');
                  })
                }
              >
                Activate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  void runMutation(async () => {
                    const offer = await suspendStoreOffer(lastOffer.id);
                    setLastOffer(offer);
                    setMessage('Offer suspended.');
                  })
                }
              >
                Suspend
              </Button>
            </div>
            <form className="space-y-2" onSubmit={onUpdateOfferPrice}>
              <label className={labelClass}>
                New price (minor units)
                <input
                  className={fieldClass}
                  name="priceMinor"
                  type="number"
                  min={0}
                  step={1}
                  required
                  defaultValue={lastOffer.priceMinor}
                  disabled={pending}
                />
              </label>
              <label className={labelClass}>
                Currency (optional)
                <input
                  className={fieldClass}
                  name="currencyCode"
                  maxLength={3}
                  defaultValue={lastOffer.currencyCode}
                  disabled={pending}
                />
              </label>
              <Button type="submit" size="sm" disabled={pending}>
                Update price
              </Button>
            </form>
          </div>
        ) : null}
      </section>
    </div>
  );
}
