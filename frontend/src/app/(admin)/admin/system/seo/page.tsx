'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { getAccessToken } from '@/lib/auth-session';
import {
  enqueueSeoProductFeeds,
  enqueueSeoSitemapRefresh,
  fetchSeoAdminHealth,
  saveSeoOverride,
  saveSeoRedirects,
  type SeoAdminHealth,
} from '@/lib/seo-admin-api';

function statusBadge(status: string) {
  if (status === 'fresh' || status === 'configured') {
    return 'bg-emerald-100 text-emerald-900';
  }
  if (status === 'stale') {
    return 'bg-amber-100 text-amber-900';
  }
  return 'bg-muted text-muted-foreground';
}

export default function AdminSeoPage() {
  const [health, setHealth] = useState<SeoAdminHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadHealth = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setError('Sign in required.');
      return;
    }
    try {
      const next = await fetchSeoAdminHealth(token);
      setHealth(next);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not load SEO health.');
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  async function onOverrideSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token || pending) {
      return;
    }
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      await saveSeoOverride(token, {
        entityType: String(form.get('entityType')) as 'product' | 'category' | 'cms',
        entityId: String(form.get('entityId')),
        title: String(form.get('title') || '').trim() || null,
        description: String(form.get('description') || '').trim() || null,
        noindex: form.get('noindex') === 'on' ? true : null,
        canonicalUrl: String(form.get('canonicalUrl') || '').trim() || null,
      });
      setMessage('SEO override saved.');
      await loadHealth();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Override save failed.');
    } finally {
      setPending(false);
    }
  }

  async function onRedirectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token || pending) {
      return;
    }
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      await saveSeoRedirects(token, {
        sourcePath: String(form.get('sourcePath')),
        targetPath: String(form.get('targetPath') || '').trim() || null,
        statusCode: Number(form.get('statusCode')) as 301 | 302 | 410,
      });
      setMessage('Redirect rule saved.');
      await loadHealth();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Redirect save failed.');
    } finally {
      setPending(false);
    }
  }

  async function refreshJob(kind: 'sitemap' | 'feeds') {
    const token = getAccessToken();
    if (!token || pending) {
      return;
    }
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      if (kind === 'sitemap') {
        await enqueueSeoSitemapRefresh(token);
        setMessage('Sitemap regeneration queued.');
      } else {
        await enqueueSeoProductFeeds(token);
        setMessage('Product feed regeneration queued.');
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Job enqueue failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="SEO"
        description="Manage metadata overrides, redirects, and monitor sitemap / product feed synchronization."
      />
      <p className="text-sm text-muted-foreground">
        Admin API: <code className="text-xs">GET /admin/seo/health</code>,{' '}
        <code className="text-xs">POST /admin/seo/overrides</code>,{' '}
        <code className="text-xs">POST /admin/seo/redirects</code>.{' '}
        <Link href="/admin/system/marketing" className="underline">
          Marketing / tracking
        </Link>
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Sync status</h2>
        {!health ? (
          <p className="text-sm text-muted-foreground">Loading health metrics…</p>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Job</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Last run</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-3 py-2">Sitemap generation</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${statusBadge(health.jobs.sitemap.status)}`}
                    >
                      {health.jobs.sitemap.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {health.jobs.sitemap.lastUpdatedAt ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => void refreshJob('sitemap')}
                    >
                      Queue refresh
                    </Button>
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-3 py-2">Product feeds (Google / Meta)</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${statusBadge(health.jobs.productFeeds.status)}`}
                    >
                      {health.jobs.productFeeds.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {health.jobs.productFeeds.lastUpdatedAt ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => void refreshJob('feeds')}
                    >
                      Queue refresh
                    </Button>
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-3 py-2">Meta CAPI (server tracking)</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${statusBadge(health.jobs.metaCapi.status)}`}
                    >
                      {health.jobs.metaCapi.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">—</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">via env + outbox</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {health ? (
          <p className="text-xs text-muted-foreground">
            Health: {health.brokenRedirectsCount} broken redirect(s), {health.missingMetadataCount}{' '}
            override(s) missing title and description.
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={(e) => void onOverrideSubmit(e)}
          className="space-y-4 border border-border p-4"
        >
          <h2 className="text-lg font-medium">SEO override</h2>
          <p className="text-sm text-muted-foreground">
            Override title, description, robots indexing, and canonical URL for a product, category,
            or CMS page.
          </p>
          <label className="block space-y-1 text-sm">
            <span>Entity type</span>
            <select
              name="entityType"
              className="w-full border border-input bg-background px-2 py-1.5"
              defaultValue="product"
            >
              <option value="product">Product</option>
              <option value="category">Category</option>
              <option value="cms">CMS page</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Entity ID (UUID)</span>
            <input
              name="entityId"
              required
              className="w-full border border-input bg-background px-2 py-1.5 font-mono text-xs"
              placeholder="11111111-1111-4111-8111-111111111111"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Product URL path (reference)</span>
            <input
              name="productPath"
              className="w-full border border-input bg-background px-2 py-1.5"
              placeholder="/products/wireless-mouse"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>SEO title</span>
            <input name="title" className="w-full border border-input bg-background px-2 py-1.5" />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Meta description</span>
            <textarea
              name="description"
              rows={3}
              className="w-full border border-input bg-background px-2 py-1.5"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="noindex" />
            <span>noindex (hide from search engines)</span>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Canonical URL</span>
            <input
              name="canonicalUrl"
              className="w-full border border-input bg-background px-2 py-1.5"
              placeholder="https://shop.example.com/products/wireless-mouse"
            />
          </label>
          <Button type="submit" disabled={pending}>
            Save override
          </Button>
        </form>

        <form
          onSubmit={(e) => void onRedirectSubmit(e)}
          className="space-y-4 border border-border p-4"
        >
          <h2 className="text-lg font-medium">Redirect rule</h2>
          <p className="text-sm text-muted-foreground">
            Create or update a 301/302/410 redirect. Use bulk import via API for large migrations.
          </p>
          <label className="block space-y-1 text-sm">
            <span>Source path</span>
            <input
              name="sourcePath"
              required
              className="w-full border border-input bg-background px-2 py-1.5"
              placeholder="/old-product-url"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Target path (optional for 410)</span>
            <input
              name="targetPath"
              className="w-full border border-input bg-background px-2 py-1.5"
              placeholder="/products/new-slug"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Status code</span>
            <select
              name="statusCode"
              className="w-full border border-input bg-background px-2 py-1.5"
              defaultValue="301"
            >
              <option value="301">301 Permanent</option>
              <option value="302">302 Temporary</option>
              <option value="410">410 Gone</option>
            </select>
          </label>
          <Button type="submit" disabled={pending}>
            Save redirect
          </Button>
        </form>
      </section>

      {health?.recentJobs.length ? (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Artifact / job status</h2>
          <p className="text-xs text-muted-foreground">
            Derived from cache files and config — not a live BullMQ history. Queue refresh above to
            regenerate.
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {health.recentJobs.map((job) => (
              <li key={job.jobName}>
                <code className="text-xs">{job.jobName}</code> — {job.status}
                {job.lastRunAt ? ` · ${job.lastRunAt}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
