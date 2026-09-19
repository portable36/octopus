'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ContentBlockPreview } from '@/components/content/content-block-preview';
import {
  ContentPageBlockEditor,
  emptyParagraph,
} from '@/components/content/content-page-block-editor';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { fieldClass } from '@/components/ui/field';
import { ApiClientError } from '@/lib/api-client';
import {
  archiveAdminContentPage,
  getAdminContentPage,
  HOME_PAGE_SLUG,
  listAdminContentPagePublications,
  publishAdminContentPage,
  rollbackAdminContentPage,
  unpublishAdminContentPage,
  updateAdminContentPage,
  type AdminContentPage,
  type AdminContentPagePublication,
  type ContentBlock,
} from '@/lib/admin-content-api';

export default function AdminContentPageEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [page, setPage] = useState<AdminContentPage | null>(null);
  const [publications, setPublications] = useState<AdminContentPagePublication[]>([]);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [body, setBody] = useState<ContentBlock[]>([emptyParagraph()]);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applyPage = useCallback((loaded: AdminContentPage) => {
    setPage(loaded);
    setTitle(loaded.title);
    setSlug(loaded.slug);
    setBody(loaded.draftBody.length > 0 ? [...loaded.draftBody] : [emptyParagraph()]);
    setMetaTitle(loaded.draftSeo.metaTitle ?? '');
    setMetaDescription(loaded.draftSeo.metaDescription ?? '');
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [loaded, pubs] = await Promise.all([
        getAdminContentPage(id),
        listAdminContentPagePublications(id),
      ]);
      applyPage(loaded);
      setPublications(pubs.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load page.');
    }
  }, [applyPage, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!page) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateAdminContentPage(page.id, {
        expectedVersion: page.version,
        title,
        slug,
        body,
        seo: {
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
        },
      });
      applyPage(updated);
      setNotice('Draft saved.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to save draft.');
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: 'publish' | 'unpublish' | 'archive'): Promise<void> {
    if (!page) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next =
        action === 'publish'
          ? await publishAdminContentPage(page.id, page.version)
          : action === 'unpublish'
            ? await unpublishAdminContentPage(page.id, page.version)
            : await archiveAdminContentPage(page.id, page.version);
      applyPage(next);
      if (action === 'publish') {
        const pubs = await listAdminContentPagePublications(page.id);
        setPublications(pubs.items);
      }
      setNotice(
        action === 'publish' ? 'Published.' : action === 'unpublish' ? 'Unpublished.' : 'Archived.',
      );
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : `Failed to ${action}.`);
    } finally {
      setBusy(false);
    }
  }

  async function onRollback(publicationId: string): Promise<void> {
    if (!page) return;
    if (
      !window.confirm(
        'Roll back live content to this publication? A new publication record will be created.',
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await rollbackAdminContentPage(page.id, page.version, publicationId);
      applyPage(next);
      const pubs = await listAdminContentPagePublications(page.id);
      setPublications(pubs.items);
      setNotice('Rolled back to selected publication.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to roll back.');
    } finally {
      setBusy(false);
    }
  }

  if (!page && !error) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const isHome = slug === HOME_PAGE_SLUG || page?.slug === HOME_PAGE_SLUG;
  const archived = Boolean(page?.archivedAt);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={page?.title ?? 'Content page'}
        description={
          page
            ? isHome
              ? `Status ${page.status} · version ${page.version} · drives storefront /`
              : `Status ${page.status} · version ${page.version} · public /pages/${page.slug}`
            : 'Editor'
        }
      />
      <p className="text-sm">
        <Link href="/admin/system/content/pages" className="underline-offset-2 hover:underline">
          ← All pages
        </Link>
      </p>

      {isHome ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          Slug <code className="font-mono text-xs">{HOME_PAGE_SLUG}</code> replaces the theme
          hero/promo on the storefront homepage when published.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{notice}</p>
      ) : null}

      {page ? (
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>Title</span>
              <input
                className={fieldClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Slug</span>
              <input
                className={fieldClass}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>SEO title</span>
              <input
                className={fieldClass}
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>SEO description</span>
              <input
                className={fieldClass}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <h2 className="text-sm font-medium">Draft blocks</h2>
              <ContentPageBlockEditor body={body} onChange={setBody} disabled={archived || busy} />
            </div>
            <aside className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
              <h2 className="text-sm font-medium">Draft preview</h2>
              <p className="text-xs text-muted-foreground">
                Simplified client preview. Images show media id until published render.
              </p>
              <ContentBlockPreview body={body} />
            </aside>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || archived}>
              Save draft
            </Button>
            <Button
              type="button"
              disabled={busy || archived}
              onClick={() => void runAction('publish')}
            >
              Publish
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || archived}
              onClick={() => void runAction('unpublish')}
            >
              Unpublish
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || archived}
              onClick={() => void runAction('archive')}
            >
              Archive
            </Button>
          </div>
        </form>
      ) : null}

      {page && publications.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Publication history</h2>
          <ul className="divide-y divide-border rounded-md border border-border">
            {publications.map((pub) => {
              const isCurrent = page.currentPublicationId === pub.id;
              return (
                <li
                  key={pub.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {pub.title}{' '}
                      <span className="font-normal text-muted-foreground">/{pub.slug}</span>
                      {isCurrent ? (
                        <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      v{pub.pageVersion} · {new Date(pub.publishedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || isCurrent || archived}
                    onClick={() => void onRollback(pub.id)}
                  >
                    Roll back
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
