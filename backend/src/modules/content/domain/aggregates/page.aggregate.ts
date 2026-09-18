import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import type {
  ContentBlock,
  ContentPageSeo,
  ContentPageStatus,
  PagePublicationSnapshot,
} from '../content.types';
import { SLUG_PATTERN } from '../content.types';
import { ContentDomainError, ContentPageVersionConflictError } from '../errors/content.errors';

type PageProps = {
  title: string;
  slug: string;
  status: ContentPageStatus;
  draftBody: readonly ContentBlock[];
  draftSeo: ContentPageSeo;
  version: number;
  currentPublicationId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
};

function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new ContentDomainError('Title is required.', 'CONTENT_PAGE_INVALID_TITLE');
  }
  if (trimmed.length > 200) {
    throw new ContentDomainError(
      'Title must be at most 200 characters.',
      'CONTENT_PAGE_INVALID_TITLE',
    );
  }
  return trimmed;
}

function normalizeSlug(slug: string): string {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed || trimmed.length > 200 || !SLUG_PATTERN.test(trimmed)) {
    throw new ContentDomainError(
      'Slug must be URL-safe lowercase letters, numbers, and hyphens.',
      'CONTENT_PAGE_INVALID_SLUG',
    );
  }
  return trimmed;
}

function normalizeSeo(seo: ContentPageSeo | undefined): ContentPageSeo {
  if (!seo) {
    return {};
  }
  return {
    ...(seo.metaTitle !== undefined ? { metaTitle: seo.metaTitle.trim() } : {}),
    ...(seo.metaDescription !== undefined ? { metaDescription: seo.metaDescription.trim() } : {}),
    ...(seo.canonicalPath !== undefined ? { canonicalPath: seo.canonicalPath.trim() } : {}),
  };
}

function assertBodyNotEmpty(body: readonly ContentBlock[]): void {
  if (body.length === 0) {
    throw new ContentDomainError(
      'Publish requires at least one content block.',
      'CONTENT_PAGE_EMPTY_BODY',
    );
  }
}

export class Page extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: PageProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly title: string;
    readonly slug: string;
    readonly body?: readonly ContentBlock[];
    readonly seo?: ContentPageSeo;
    readonly actorUserId: string | null;
  }): Page {
    const now = new Date();
    const page = new Page(UniqueID.create(), {
      title: normalizeTitle(input.title),
      slug: normalizeSlug(input.slug),
      status: 'DRAFT',
      draftBody: Object.freeze([...(input.body ?? [])]),
      draftSeo: normalizeSeo(input.seo),
      version: 1,
      currentPublicationId: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
    });
    page.addEvent('ContentPageCreated', {
      pageId: page.id.value,
      slug: page.props.slug,
    });
    return page;
  }

  public static rehydrate(input: {
    readonly id: string;
    readonly title: string;
    readonly slug: string;
    readonly status: ContentPageStatus;
    readonly draftBody: readonly ContentBlock[];
    readonly draftSeo: ContentPageSeo;
    readonly version: number;
    readonly currentPublicationId: string | null;
    readonly archivedAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly createdBy: string | null;
    readonly updatedBy: string | null;
  }): Page {
    return new Page(UniqueID.from(input.id), {
      title: input.title,
      slug: input.slug,
      status: input.status,
      draftBody: Object.freeze([...input.draftBody]),
      draftSeo: input.draftSeo,
      version: input.version,
      currentPublicationId: input.currentPublicationId,
      archivedAt: input.archivedAt,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    });
  }

  get title(): string {
    return this.props.title;
  }
  get slug(): string {
    return this.props.slug;
  }
  get status(): ContentPageStatus {
    return this.props.status;
  }
  get draftBody(): readonly ContentBlock[] {
    return this.props.draftBody;
  }
  get draftSeo(): ContentPageSeo {
    return this.props.draftSeo;
  }
  get version(): number {
    return this.props.version;
  }
  get currentPublicationId(): string | null {
    return this.props.currentPublicationId;
  }
  get archivedAt(): Date | null {
    return this.props.archivedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get createdBy(): string | null {
    return this.props.createdBy;
  }
  get updatedBy(): string | null {
    return this.props.updatedBy;
  }

  public assertExpectedVersion(expectedVersion: number): void {
    if (this.props.version !== expectedVersion) {
      throw new ContentPageVersionConflictError(
        `Content page version mismatch: expected ${expectedVersion}, got ${this.props.version}.`,
      );
    }
  }

  private assertNotArchived(): void {
    if (this.props.archivedAt) {
      throw new ContentDomainError('Archived pages cannot be modified.', 'CONTENT_PAGE_ARCHIVED');
    }
  }

  public updateDraft(input: {
    readonly expectedVersion: number;
    readonly title?: string;
    readonly slug?: string;
    readonly body?: readonly ContentBlock[];
    readonly seo?: ContentPageSeo;
    readonly actorUserId: string | null;
  }): void {
    this.assertNotArchived();
    this.assertExpectedVersion(input.expectedVersion);
    this.props = {
      ...this.props,
      title: input.title !== undefined ? normalizeTitle(input.title) : this.props.title,
      slug: input.slug !== undefined ? normalizeSlug(input.slug) : this.props.slug,
      draftBody: input.body !== undefined ? Object.freeze([...input.body]) : this.props.draftBody,
      draftSeo: input.seo !== undefined ? normalizeSeo(input.seo) : this.props.draftSeo,
      version: this.props.version + 1,
      updatedAt: new Date(),
      updatedBy: input.actorUserId,
    };
    this.addEvent('ContentPageDraftUpdated', {
      pageId: this.id.value,
      version: this.props.version,
    });
  }

  public publish(input: {
    readonly expectedVersion: number;
    readonly actorUserId: string | null;
  }): PagePublicationSnapshot {
    this.assertNotArchived();
    this.assertExpectedVersion(input.expectedVersion);
    assertBodyNotEmpty(this.props.draftBody);

    const publicationId = UniqueID.create().value;
    const publishedAt = new Date();
    const snapshot: PagePublicationSnapshot = {
      id: publicationId,
      pageId: this.id.value,
      title: this.props.title,
      slug: this.props.slug,
      body: Object.freeze([...this.props.draftBody]),
      seo: { ...this.props.draftSeo },
      pageVersion: this.props.version,
      publishedAt,
      publishedBy: input.actorUserId,
      sourcePublicationId: null,
    };

    this.props = {
      ...this.props,
      status: 'PUBLISHED',
      currentPublicationId: publicationId,
      version: this.props.version + 1,
      updatedAt: publishedAt,
      updatedBy: input.actorUserId,
    };
    this.addEvent('ContentPagePublished', {
      pageId: this.id.value,
      publicationId,
      slug: snapshot.slug,
      version: this.props.version,
    });
    return snapshot;
  }

  public unpublish(input: {
    readonly expectedVersion: number;
    readonly actorUserId: string | null;
  }): void {
    this.assertNotArchived();
    this.assertExpectedVersion(input.expectedVersion);
    this.props = {
      ...this.props,
      status: 'UNPUBLISHED',
      currentPublicationId: null,
      version: this.props.version + 1,
      updatedAt: new Date(),
      updatedBy: input.actorUserId,
    };
    this.addEvent('ContentPageUnpublished', {
      pageId: this.id.value,
      version: this.props.version,
    });
  }

  public archive(input: {
    readonly expectedVersion: number;
    readonly actorUserId: string | null;
  }): void {
    this.assertNotArchived();
    this.assertExpectedVersion(input.expectedVersion);
    const now = new Date();
    this.props = {
      ...this.props,
      status: this.props.status === 'PUBLISHED' ? 'UNPUBLISHED' : this.props.status,
      currentPublicationId: null,
      archivedAt: now,
      version: this.props.version + 1,
      updatedAt: now,
      updatedBy: input.actorUserId,
    };
    this.addEvent('ContentPageArchived', {
      pageId: this.id.value,
      version: this.props.version,
    });
  }

  /** Rollback creates a new publication from a prior snapshot (append-only). */
  public rollbackFromPublication(input: {
    readonly expectedVersion: number;
    readonly source: PagePublicationSnapshot;
    readonly actorUserId: string | null;
  }): PagePublicationSnapshot {
    this.assertNotArchived();
    this.assertExpectedVersion(input.expectedVersion);
    if (input.source.pageId !== this.id.value) {
      throw new ContentDomainError(
        'Publication does not belong to this page.',
        'CONTENT_PAGE_PUBLICATION_MISMATCH',
      );
    }
    assertBodyNotEmpty(input.source.body);

    const publicationId = UniqueID.create().value;
    const publishedAt = new Date();
    const snapshot: PagePublicationSnapshot = {
      id: publicationId,
      pageId: this.id.value,
      title: input.source.title,
      slug: input.source.slug,
      body: Object.freeze([...input.source.body]),
      seo: { ...input.source.seo },
      pageVersion: this.props.version,
      publishedAt,
      publishedBy: input.actorUserId,
      sourcePublicationId: input.source.id,
    };

    this.props = {
      ...this.props,
      title: input.source.title,
      slug: input.source.slug,
      draftBody: Object.freeze([...input.source.body]),
      draftSeo: { ...input.source.seo },
      status: 'PUBLISHED',
      currentPublicationId: publicationId,
      version: this.props.version + 1,
      updatedAt: publishedAt,
      updatedBy: input.actorUserId,
    };
    this.addEvent('ContentPageRolledBack', {
      pageId: this.id.value,
      publicationId,
      sourcePublicationId: input.source.id,
      version: this.props.version,
    });
    return snapshot;
  }
}
