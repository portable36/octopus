import { authedRequest } from '@/lib/auth-api';

export type ContentLeafBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'markdown'; markdown: string }
  | { type: 'image'; mediaId: string; alt?: string }
  | { type: 'button'; label: string; href: string }
  | { type: 'product'; productId: string }
  | { type: 'offer'; offerId: string };

export type ContentSectionBlock = {
  type: 'section';
  columns: 1 | 2 | 3;
  children: ContentLeafBlock[][];
};

export type ContentBlock = ContentLeafBlock | ContentSectionBlock;

export type ContentPageSeo = {
  metaTitle?: string;
  metaDescription?: string;
  canonicalPath?: string;
};

export type AdminContentPage = {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  version: number;
  draftBody: ContentBlock[];
  draftSeo: ContentPageSeo;
  currentPublicationId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminContentPageListItem = {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  version: number;
  updatedAt: string;
  archivedAt: string | null;
};

export type AdminContentPageListResult = {
  items: AdminContentPageListItem[];
  nextCursor: string | null;
};

/** Reserved slug: published body drives the storefront homepage at `/`. */
export const HOME_PAGE_SLUG = 'home';

export function listAdminContentPages(
  input: {
    q?: string | null;
    status?: string | null;
    includeArchived?: boolean;
    limit?: number;
    cursor?: string | null;
  } = {},
): Promise<AdminContentPageListResult> {
  const params = new URLSearchParams();
  if (input.q) params.set('q', input.q);
  if (input.status) params.set('status', input.status);
  if (input.includeArchived) params.set('includeArchived', 'true');
  if (input.limit) params.set('limit', String(input.limit));
  if (input.cursor) params.set('cursor', input.cursor);
  const qs = params.toString();
  return authedRequest<AdminContentPageListResult>(`/admin/content/pages${qs ? `?${qs}` : ''}`);
}

export function createAdminContentPage(input: {
  title: string;
  slug: string;
  body?: ContentBlock[];
  seo?: ContentPageSeo;
}): Promise<AdminContentPage> {
  return authedRequest<AdminContentPage>('/admin/content/pages', {
    method: 'POST',
    body: input,
  });
}

export function getAdminContentPage(id: string): Promise<AdminContentPage> {
  return authedRequest<AdminContentPage>(`/admin/content/pages/${id}`);
}

export function updateAdminContentPage(
  id: string,
  input: {
    expectedVersion: number;
    title?: string;
    slug?: string;
    body?: ContentBlock[];
    seo?: ContentPageSeo;
  },
): Promise<AdminContentPage> {
  return authedRequest<AdminContentPage>(`/admin/content/pages/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function publishAdminContentPage(
  id: string,
  expectedVersion: number,
): Promise<AdminContentPage> {
  return authedRequest<AdminContentPage>(`/admin/content/pages/${id}/publish`, {
    method: 'POST',
    body: { expectedVersion },
  });
}

export function unpublishAdminContentPage(
  id: string,
  expectedVersion: number,
): Promise<AdminContentPage> {
  return authedRequest<AdminContentPage>(`/admin/content/pages/${id}/unpublish`, {
    method: 'POST',
    body: { expectedVersion },
  });
}

export function archiveAdminContentPage(
  id: string,
  expectedVersion: number,
): Promise<AdminContentPage> {
  return authedRequest<AdminContentPage>(`/admin/content/pages/${id}/archive`, {
    method: 'POST',
    body: { expectedVersion },
  });
}

export type AdminContentPagePublication = {
  id: string;
  title: string;
  slug: string;
  pageVersion: number;
  publishedAt: string;
  publishedBy: string | null;
  sourcePublicationId: string | null;
};

export function listAdminContentPagePublications(
  id: string,
): Promise<{ items: AdminContentPagePublication[] }> {
  return authedRequest<{ items: AdminContentPagePublication[] }>(
    `/admin/content/pages/${id}/publications`,
  );
}

export function rollbackAdminContentPage(
  id: string,
  expectedVersion: number,
  publicationId: string,
): Promise<AdminContentPage> {
  return authedRequest<AdminContentPage>(`/admin/content/pages/${id}/rollback`, {
    method: 'POST',
    body: { expectedVersion, publicationId },
  });
}
