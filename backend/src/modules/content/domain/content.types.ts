export const CONTENT_PAGE_STATUSES = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] as const;
export type ContentPageStatus = (typeof CONTENT_PAGE_STATUSES)[number];

export type ContentBlock =
  | { readonly type: 'heading'; readonly level: 1 | 2 | 3; readonly text: string }
  | { readonly type: 'paragraph'; readonly text: string }
  | { readonly type: 'markdown'; readonly markdown: string }
  | { readonly type: 'image'; readonly mediaId: string; readonly alt?: string };

export type ContentPageSeo = {
  readonly metaTitle?: string;
  readonly metaDescription?: string;
  readonly canonicalPath?: string;
};

export type PagePublicationSnapshot = {
  readonly id: string;
  readonly pageId: string;
  readonly title: string;
  readonly slug: string;
  readonly body: readonly ContentBlock[];
  readonly seo: ContentPageSeo;
  readonly pageVersion: number;
  readonly publishedAt: Date;
  readonly publishedBy: string | null;
  readonly sourcePublicationId: string | null;
};

export type PublicContentPageDto = {
  readonly id: string;
  readonly publicationId: string;
  readonly title: string;
  readonly slug: string;
  readonly body: readonly ContentBlock[];
  readonly seo: ContentPageSeo;
  readonly publishedAt: string;
};

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
