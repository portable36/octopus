'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  readonly actionPath?: string;
};

/** Client island: syncs filter fields into URL search params for RSC pages. */
export function SearchFiltersForm({ actionPath = '/search' }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [sort, setSort] = useState(params.get('sort') ?? 'relevance');
  const [minPrice, setMinPrice] = useState(params.get('minPriceMinor') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPriceMinor') ?? '');
  const [stockStatus, setStockStatus] = useState(params.get('stockStatus') ?? '');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams();
    const categoryId = params.get('categoryId');
    const storeId = params.get('storeId');
    const vendorId = params.get('vendorId');
    if (q.trim()) {
      next.set('q', q.trim());
    }
    if (categoryId) {
      next.set('categoryId', categoryId);
    }
    if (storeId) {
      next.set('storeId', storeId);
    }
    if (vendorId) {
      next.set('vendorId', vendorId);
    }
    if (sort && sort !== 'relevance') {
      next.set('sort', sort);
    }
    if (minPrice.trim()) {
      next.set('minPriceMinor', minPrice.trim());
    }
    if (maxPrice.trim()) {
      next.set('maxPriceMinor', maxPrice.trim());
    }
    if (stockStatus) {
      next.set('stockStatus', stockStatus);
    }
    const qs = next.toString();
    router.push(qs ? `${actionPath}?${qs}` : actionPath);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 border border-border p-4 md:flex-row md:flex-wrap md:items-end"
      aria-label="Search filters"
    >
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Query</span>
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3"
          placeholder="Search products"
        />
      </label>
      <label className="flex w-full flex-col gap-1 text-sm md:w-40">
        <span className="text-muted-foreground">Sort</span>
        <select
          name="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3"
        >
          <option value="relevance">Relevance</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="newest">Newest</option>
        </select>
      </label>
      <label className="flex w-full flex-col gap-1 text-sm md:w-36">
        <span className="text-muted-foreground">Min (minor)</span>
        <input
          name="minPriceMinor"
          inputMode="numeric"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3"
        />
      </label>
      <label className="flex w-full flex-col gap-1 text-sm md:w-36">
        <span className="text-muted-foreground">Max (minor)</span>
        <input
          name="maxPriceMinor"
          inputMode="numeric"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3"
        />
      </label>
      <label className="flex w-full flex-col gap-1 text-sm md:w-44">
        <span className="text-muted-foreground">Stock</span>
        <select
          name="stockStatus"
          value={stockStatus}
          onChange={(e) => setStockStatus(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3"
        >
          <option value="">Any</option>
          <option value="IN_STOCK">In stock</option>
          <option value="OUT_OF_STOCK">Out of stock</option>
        </select>
      </label>
      <Button type="submit" className="md:mb-0">
        Apply
      </Button>
    </form>
  );
}
