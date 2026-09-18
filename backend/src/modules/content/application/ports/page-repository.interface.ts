import type { Page } from '../../domain/aggregates/page.aggregate';
import type {
  ContentPageStatus,
  PagePublicationSnapshot,
  PublicContentPageDto,
} from '../../domain/content.types';

export const PAGE_REPOSITORY = Symbol('PAGE_REPOSITORY');

export type PageListFilter = {
  readonly limit: number;
  readonly cursor?: string | null;
  readonly q?: string | null;
  readonly status?: ContentPageStatus | null;
  readonly includeArchived?: boolean;
};

export type PageListItem = {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: ContentPageStatus;
  readonly version: number;
  readonly updatedAt: Date;
  readonly archivedAt: Date | null;
};

export type PageListResult = {
  readonly items: readonly PageListItem[];
  readonly nextCursor: string | null;
};

export interface PageRepository {
  save(page: Page, publication?: PagePublicationSnapshot | null): Promise<void>;
  findById(id: string): Promise<Page | null>;
  findBySlugActive(slug: string): Promise<Page | null>;
  list(filter: PageListFilter): Promise<PageListResult>;
  findPublishedBySlug(slug: string): Promise<PublicContentPageDto | null>;
  findPublicationById(publicationId: string): Promise<PagePublicationSnapshot | null>;
}
