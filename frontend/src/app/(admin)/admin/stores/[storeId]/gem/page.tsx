'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function AdminStoreGemPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;

  return (
    <div className="space-y-4">
      <section className="space-y-3 border border-border bg-background p-4">
        <div>
          <h2 className="text-sm font-medium">GEM & marketing tags</h2>
          <p className="text-xs text-muted-foreground">
            GEM schema / tracking environment and GTM·GA4·Meta IDs are platform settings. There is
            no store-scoped GEM control plane yet (recommendation engine remains deferred).
          </p>
        </div>
        <ul className="list-inside list-disc text-sm">
          <li>
            <Link href="/admin/system/marketing" className="underline underline-offset-2">
              Marketing settings
            </Link>{' '}
            — public tag IDs (secrets stay server-only)
          </li>
          <li>
            <Link href="/admin/system/global-config" className="underline underline-offset-2">
              Platform config → Marketing
            </Link>{' '}
            — <code className="text-xs">GEM_SCHEMA_VERSION</code> / tracking environment
          </li>
        </ul>
      </section>

      <section className="space-y-2 border border-border bg-background p-4">
        <h2 className="text-sm font-medium">Related</h2>
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          <li>
            First-party store performance:{' '}
            <Link
              href={`/admin/stores/${storeId}/analytics`}
              className="underline underline-offset-2"
            >
              Analytics
            </Link>{' '}
            (not GA4)
          </li>
          <li>
            Storefront dataLayer emits GEM fields from{' '}
            <code className="text-[11px]">NEXT_PUBLIC_GEM_*</code> / backend global config.
          </li>
        </ul>
      </section>
    </div>
  );
}
