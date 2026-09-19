export const CONTENT_PAGE_STATUSES = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] as const;
export type ContentPageStatus = (typeof CONTENT_PAGE_STATUSES)[number];

/** Reserved slug: storefront `/` uses published body when present. */
export const HOME_PAGE_SLUG = 'home';

export type ContentLeafBlock =
  | { readonly type: 'heading'; readonly level: 1 | 2 | 3; readonly text: string }
  | { readonly type: 'paragraph'; readonly text: string }
  | { readonly type: 'markdown'; readonly markdown: string }
  | { readonly type: 'image'; readonly mediaId: string; readonly alt?: string }
  | { readonly type: 'button'; readonly label: string; readonly href: string }
  | { readonly type: 'product'; readonly productId: string }
  | { readonly type: 'offer'; readonly offerId: string };

export type ContentSectionBlock = {
  readonly type: 'section';
  readonly columns: 1 | 2 | 3;
  /** One array of leaf blocks per column. Length must equal `columns`. */
  readonly children: readonly (readonly ContentLeafBlock[])[];
};

/** Additive union — legacy pages use only the original four leaf types. */
export type ContentBlock = ContentLeafBlock | ContentSectionBlock;

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
