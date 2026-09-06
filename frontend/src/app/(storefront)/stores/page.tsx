import Link from 'next/link';
import type { Metadata } from 'next';
import { ApiClientError } from '@/lib/api-client';
import { absoluteUrl } from '@/lib/seo';
import { fetchPublicStores, type PublicStore } from '@/lib/storefront-api';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Stores & Shops',
  description: 'Browse verified vendors and independent retail stores on Octopus.',
  alternates: { canonical: absoluteUrl('/stores') },
};

export default async function StoresPage() {
  let stores: PublicStore[] = [];
  let loadError: string | null = null;
  try {
    stores = await fetchPublicStores();
  } catch (error) {
    loadError = error instanceof ApiClientError ? error.message : 'Failed to load stores.';
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="sf-eyebrow">Marketplace Directory</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Stores &amp; Shops</h1>
        <p className="max-w-xl text-muted-foreground">
          Discover independent retail outlets, authorized distributors, and specialty boutiques
          across Bangladesh.
        </p>
      </header>

      {loadError ? (
        <p className="sf-panel text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : stores.length === 0 ? (
        <p className="sf-panel text-sm text-muted-foreground">
          No active stores are listed at the moment. Please check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => {
            const storeHref = `/stores/${encodeURIComponent(store.slug)}${
              store.vendorId ? `?vendorId=${encodeURIComponent(store.vendorId)}` : ''
            }`;

            return (
              <div
                key={store.id}
                className="group flex flex-col justify-between rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold tracking-tight group-hover:text-primary transition-colors">
                      <Link href={storeHref}>{store.displayName}</Link>
                    </h2>
                    {store.acceptsOnlineOrders && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                        Online Orders
                      </span>
                    )}
                  </div>

                  {store.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {store.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Verified merchant on Octopus
                    </p>
                  )}

                  {(store.city || store.region) && (
                    <p className="text-xs text-muted-foreground">
                      📍 {[store.city, store.region].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="font-medium text-muted-foreground">
                    Currency: {store.currencyCode}
                  </span>
                  <Link
                    href={storeHref}
                    className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Visit Store <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
