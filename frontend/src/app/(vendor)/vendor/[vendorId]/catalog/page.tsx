'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  createVendorProduct,
  listCatalogCategories,
  listVendorProducts,
  type CatalogCategory,
  type VendorProduct,
} from '@/lib/vendor-api';

const fieldClass = 'h-10 rounded-md border border-border bg-background px-3';
const labelClass = 'flex flex-col gap-1 text-sm';
const formClass = 'max-w-lg space-y-3 rounded-md border border-border bg-background p-4';

function formString(form: FormData, name: string): string {
  return String(form.get(name) || '').trim();
}

export default function VendorCatalogPage() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;
  const [products, setProducts] = useState<VendorProduct[] | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    const rows = await listVendorProducts(vendorId);
    setProducts(rows);
  }, [vendorId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [rows, cats] = await Promise.all([
          listVendorProducts(vendorId),
          listCatalogCategories().catch(() => [] as CatalogCategory[]),
        ]);
        if (!cancelled) {
          setProducts(rows);
          setCategories(cats.filter((c) => c.status !== 'ARCHIVED'));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load products.');
          setProducts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const el = event.currentTarget;
    const form = new FormData(el);
    const description = formString(form, 'description');
    const categoryIds = form.getAll('categoryIds').map(String).filter(Boolean);
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await createVendorProduct({
        vendorId,
        sku: formString(form, 'sku'),
        name: formString(form, 'name'),
        ...(description ? { description } : {}),
        ...(categoryIds.length > 0 ? { categoryIds } : {}),
      });
      await reload();
      setMessage('Product created.');
      el.reset();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to create product.');
    } finally {
      setPending(false);
    }
  }

  if (products === null && !error) {
    return <p className="text-sm text-muted-foreground">Loading catalog…</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Catalog</h2>
        <p className="text-sm text-muted-foreground">
          Create products and open a row for variants and offers.
        </p>
      </header>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <form className={formClass} onSubmit={onCreate}>
        <h3 className="text-sm font-medium">Create product</h3>
        <label className={labelClass}>
          SKU
          <input className={fieldClass} name="sku" required minLength={3} disabled={pending} />
        </label>
        <label className={labelClass}>
          Name
          <input className={fieldClass} name="name" required minLength={3} disabled={pending} />
        </label>
        <label className={labelClass}>
          Description (optional)
          <textarea
            className="min-h-20 rounded-md border border-border bg-background px-3 py-2"
            name="description"
            disabled={pending}
          />
        </label>
        {categories.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Categories (optional)</legend>
            <div className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2">
                  <input type="checkbox" name="categoryIds" value={cat.id} disabled={pending} />
                  {cat.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create product'}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Variants</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                  No products yet.
                </td>
              </tr>
            ) : (
              (products ?? []).map((product) => (
                <tr key={product.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <Link
                      className="font-medium underline-offset-4 hover:underline"
                      href={`/vendor/${vendorId}/catalog/${product.id}`}
                    >
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{product.sku}</td>
                  <td className="px-3 py-2">{product.status}</td>
                  <td className="px-3 py-2 tabular-nums">{product.variantIds.length}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
