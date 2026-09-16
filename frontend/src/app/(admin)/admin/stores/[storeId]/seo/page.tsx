'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function AdminStoreSeoPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;

  return (
    <div className="space-y-4">
      <section className="space-y-3 border border-border bg-background p-4">
        <div>
          <h2 className="text-sm font-medium">SEO (platform-scoped)</h2>
          <p className="text-xs text-muted-foreground">
            Product / category / CMS overrides, redirects, and sitemap jobs live in the SEO admin —
            not as a separate store Settings document. Use entity IDs from this store&apos;s catalog
            when saving overrides.
          </p>
        </div>
        <p className="text-sm">
          <Link href="/admin/system/seo" className="underline underline-offset-2">
            Open SEO admin →
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          Store id for reference:{' '}
          <code className="font-mono text-[11px]">{storeId}</code>
        </p>
      </section>

      <section className="space-y-2 border border-border bg-background p-4">
        <h2 className="text-sm font-medium">Related</h2>
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          <li>
            <Link
              href={`/admin/stores/${storeId}/catalog`}
              className="underline underline-offset-2"
            >
              Catalog
            </Link>{' '}
            — offers / product ids for overrides
          </li>
          <li>
            <Link
              href={`/admin/stores/${storeId}/branding`}
              className="underline underline-offset-2"
            >
              Branding
            </Link>{' '}
            — display name / accent (not meta title)
          </li>
        </ul>
      </section>
    </div>
  );
}
