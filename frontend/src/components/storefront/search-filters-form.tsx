'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  readonly actionPath?: string;
};

export type SearchFilterValues = {
  readonly q: string;
  readonly sort: string;
  readonly minPrice: string;
  readonly maxPrice: string;
  readonly stockStatus: string;
};

export function buildSearchFilterUrl(
  actionPath: string,
  currentParams: URLSearchParams,
  values: SearchFilterValues,
): string {
  const next = new URLSearchParams();
  for (const key of ['categoryId', 'storeId', 'vendorId'] as const) {
    const value = currentParams.get(key);
    if (value) {
      next.set(key, value);
    }
  }
  if (values.q.trim()) {
    next.set('q', values.q.trim());
  }
  if (values.sort && values.sort !== 'relevance') {
    next.set('sort', values.sort);
  }
  if (values.minPrice.trim()) {
    next.set('minPriceMinor', values.minPrice.trim());
  }
  if (values.maxPrice.trim()) {
    next.set('maxPriceMinor', values.maxPrice.trim());
  }
  if (values.stockStatus) {
    next.set('stockStatus', values.stockStatus);
  }
  const qs = next.toString();
  return qs ? `${actionPath}?${qs}` : actionPath;
}

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
    router.push(
      buildSearchFilterUrl(actionPath, params, {
        q,
        sort,
        minPrice,
        maxPrice,
        stockStatus,
      }),
    );
  }

  const activeFilters = [
    ['q', q.trim() ? `Search: ${q.trim()}` : ''],
    ['sort', sort !== 'relevance' ? `Sort: ${sort}` : ''],
    ['minPriceMinor', minPrice.trim() ? `From: ${minPrice.trim()}` : ''],
    ['maxPriceMinor', maxPrice.trim() ? `To: ${maxPrice.trim()}` : ''],
    ['stockStatus', stockStatus ? `Stock: ${stockStatus.replaceAll('_', ' ')}` : ''],
  ] as const;

  function clearFilter(key: string): string {
    const next = new URLSearchParams(params.toString());
    next.delete(key);
    next.delete('page');
    const qs = next.toString();
    return qs ? `${actionPath}?${qs}` : actionPath;
  }

  return (
    <>
      <div className="sf-filter-chips" aria-label="Active filters">
        {activeFilters.map(([key, label]) =>
          label ? (
            <Link key={key} href={clearFilter(key)} className="sf-filter-chip">
              {label}
              <span aria-hidden="true">×</span>
            </Link>
          ) : null,
        )}
        {activeFilters.some(([, label]) => Boolean(label)) ? (
          <Link href={actionPath} className="sf-clear-filters">
            Clear all
          </Link>
        ) : null}
      </div>
      <form onSubmit={onSubmit} className="sf-form" aria-label="Search filters">
        <label>
          <span>Search</span>
          <input
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products"
          />
        </label>
        <label>
          <span>Sort by</span>
          <select name="sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
            <option value="newest">Newest</option>
          </select>
        </label>
        <label>
          <span>Minimum price</span>
          <input
            name="minPriceMinor"
            inputMode="numeric"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </label>
        <label>
          <span>Maximum price</span>
          <input
            name="maxPriceMinor"
            inputMode="numeric"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </label>
        <label>
          <span>Availability</span>
          <select
            name="stockStatus"
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
          >
            <option value="">Any</option>
            <option value="IN_STOCK">In stock</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
          </select>
        </label>
        <Button type="submit" className="sf-button-primary border-0">
          Apply
        </Button>
      </form>
    </>
  );
}
