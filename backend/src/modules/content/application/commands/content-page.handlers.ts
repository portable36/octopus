import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
import {
  CATALOG_OFFER_SEARCH_SOURCE,
  type CatalogOfferSearchSourcePort,
} from '../../../../shared-kernel/application/ports/catalog-offer-search-source.port';
import {
  MEDIA_ASSET_ACCESS,
  type MediaAssetAccessPort,
} from '../../../../shared-kernel/application/ports/media-asset-access.port';
import { Page } from '../../domain/aggregates/page.aggregate';
import { walkContentLeaves } from '../../domain/content-block.validation';
import type {
  ContentBlock,
  ContentPageSeo,
  ContentPageStatus,
  PublicContentPageDto,
} from '../../domain/content.types';
import {
  ContentDomainError,
  ContentPageCatalogEmbedError,
  ContentPageMediaNotReadyError,
  ContentPageNotFoundError,
  ContentPagePublicationNotFoundError,
  ContentPageSlugConflictError,
} from '../../domain/errors/content.errors';
import {
  PAGE_REPOSITORY,
  type PageListFilter,
  type PageListResult,
  type PagePublicationListItem,
  type PageRepository,
} from '../ports/page-repository.interface';

// ponytail: skip Redis published-slug cache (T019); DB remains truth. Add
// content:page:published:<slug> + invalidate on publish/unpublish/archive when needed.

export type AdminContentPageDto = {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: ContentPageStatus;
  readonly version: number;
  readonly draftBody: readonly ContentBlock[];
  readonly draftSeo: ContentPageSeo;
  readonly currentPublicationId: string | null;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

function toAdminDto(page: Page): AdminContentPageDto {
  return {
    id: page.id.value,
    title: page.title,
    slug: page.slug,
    status: page.status,
    version: page.version,
    draftBody: page.draftBody,
    draftSeo: page.draftSeo,
    currentPublicationId: page.currentPublicationId,
    archivedAt: page.archivedAt?.toISOString() ?? null,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

@Injectable()
export class ContentPageHandlers {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pages: PageRepository,
    @Optional()
    @Inject(MEDIA_ASSET_ACCESS)
    private readonly mediaAccess: MediaAssetAccessPort | null = null,
    @Optional()
    @Inject(CATALOG_OFFER_SEARCH_SOURCE)
    private readonly catalogOffers: CatalogOfferSearchSourcePort | null = null,
    @Optional() @Inject(AUDIT_PORT) private readonly audit: AuditPort | null = null,
  ) {}

  public async create(input: {
    readonly title: string;
    readonly slug: string;
    readonly body?: readonly ContentBlock[];
    readonly seo?: ContentPageSeo;
    readonly actorUserId: string;
  }): Promise<AdminContentPageDto> {
    const existing = await this.pages.findBySlugActive(input.slug.trim().toLowerCase());
    if (existing) {
      throw new ContentPageSlugConflictError();
    }
    const page = Page.create({
      title: input.title,
      slug: input.slug,
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.seo !== undefined ? { seo: input.seo } : {}),
      actorUserId: input.actorUserId,
    });
    await this.pages.save(page);
    await this.audit?.append({
      actorUserId: input.actorUserId,
      action: 'content_page.created',
      resourceType: 'content_page',
      resourceId: page.id.value,
      after: { slug: page.slug, title: page.title, status: page.status },
    });
    return toAdminDto(page);
  }

  public async getById(id: string): Promise<AdminContentPageDto> {
    const page = await this.requirePage(id);
    return toAdminDto(page);
  }

  public async list(filter: PageListFilter): Promise<PageListResult> {
    return this.pages.list(filter);
  }

  public async update(input: {
    readonly id: string;
    readonly expectedVersion: number;
    readonly title?: string;
    readonly slug?: string;
    readonly body?: readonly ContentBlock[];
    readonly seo?: ContentPageSeo;
    readonly actorUserId: string;
  }): Promise<AdminContentPageDto> {
    const page = await this.requirePage(input.id);
    if (input.slug !== undefined) {
      const nextSlug = input.slug.trim().toLowerCase();
      if (nextSlug !== page.slug) {
        const clash = await this.pages.findBySlugActive(nextSlug);
        if (clash && clash.id.value !== page.id.value) {
          throw new ContentPageSlugConflictError();
        }
      }
    }
    const before = { title: page.title, slug: page.slug, version: page.version };
    page.updateDraft({
      expectedVersion: input.expectedVersion,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.seo !== undefined ? { seo: input.seo } : {}),
      actorUserId: input.actorUserId,
    });
    await this.pages.save(page);
    await this.audit?.append({
      actorUserId: input.actorUserId,
      action: 'content_page.updated',
      resourceType: 'content_page',
      resourceId: page.id.value,
      before,
      after: { title: page.title, slug: page.slug, version: page.version },
    });
    return toAdminDto(page);
  }

  public async publish(input: {
    readonly id: string;
    readonly expectedVersion: number;
    readonly actorUserId: string;
  }): Promise<AdminContentPageDto> {
    const page = await this.requirePage(input.id);
    await this.assertPublishRefsReady(page.draftBody);
    const publication = page.publish({
      expectedVersion: input.expectedVersion,
      actorUserId: input.actorUserId,
    });
    await this.pages.save(page, publication);
    await this.audit?.append({
      actorUserId: input.actorUserId,
      action: 'content_page.published',
      resourceType: 'content_page',
      resourceId: page.id.value,
      after: {
        publicationId: publication.id,
        slug: publication.slug,
        version: page.version,
      },
    });
    return toAdminDto(page);
  }

  public async unpublish(input: {
    readonly id: string;
    readonly expectedVersion: number;
    readonly actorUserId: string;
  }): Promise<AdminContentPageDto> {
    const page = await this.requirePage(input.id);
    page.unpublish({
      expectedVersion: input.expectedVersion,
      actorUserId: input.actorUserId,
    });
    await this.pages.save(page);
    await this.audit?.append({
      actorUserId: input.actorUserId,
      action: 'content_page.unpublished',
      resourceType: 'content_page',
      resourceId: page.id.value,
      after: { version: page.version, status: page.status },
    });
    return toAdminDto(page);
  }

  public async archive(input: {
    readonly id: string;
    readonly expectedVersion: number;
    readonly actorUserId: string;
  }): Promise<AdminContentPageDto> {
    const page = await this.requirePage(input.id);
    page.archive({
      expectedVersion: input.expectedVersion,
      actorUserId: input.actorUserId,
    });
    await this.pages.save(page);
    await this.audit?.append({
      actorUserId: input.actorUserId,
      action: 'content_page.archived',
      resourceType: 'content_page',
      resourceId: page.id.value,
      after: { version: page.version, archivedAt: page.archivedAt?.toISOString() ?? null },
    });
    return toAdminDto(page);
  }

  public async getPublishedBySlug(slug: string): Promise<PublicContentPageDto> {
    const dto = await this.pages.findPublishedBySlug(slug.trim().toLowerCase());
    if (!dto) {
      throw new ContentPageNotFoundError('Published content page was not found.');
    }
    return dto;
  }

  public async listPublications(pageId: string): Promise<readonly PagePublicationListItem[]> {
    await this.requirePage(pageId);
    return this.pages.listPublicationsByPageId(pageId);
  }

  public async rollback(input: {
    readonly id: string;
    readonly expectedVersion: number;
    readonly publicationId: string;
    readonly actorUserId: string;
  }): Promise<AdminContentPageDto> {
    const page = await this.requirePage(input.id);
    const source = await this.pages.findPublicationById(input.publicationId);
    if (!source || source.pageId !== page.id.value) {
      throw new ContentPagePublicationNotFoundError();
    }
    await this.assertPublishRefsReady(source.body);
    const publication = page.rollbackFromPublication({
      expectedVersion: input.expectedVersion,
      source,
      actorUserId: input.actorUserId,
    });
    await this.pages.save(page, publication);
    await this.audit?.append({
      actorUserId: input.actorUserId,
      action: 'content_page.rolled_back',
      resourceType: 'content_page',
      resourceId: page.id.value,
      after: {
        publicationId: publication.id,
        sourcePublicationId: source.id,
        slug: publication.slug,
        version: page.version,
      },
    });
    return toAdminDto(page);
  }

  private async requirePage(id: string): Promise<Page> {
    const page = await this.pages.findById(id);
    if (!page) {
      throw new ContentPageNotFoundError();
    }
    return page;
  }

  private async assertPublishRefsReady(body: readonly ContentBlock[]): Promise<void> {
    const leaves = walkContentLeaves(body);
    const mediaIds = leaves
      .filter((b) => b.type === 'image')
      .map((b) => b.mediaId.trim())
      .filter(Boolean);
    const productIds = leaves
      .filter((b) => b.type === 'product')
      .map((b) => b.productId.trim())
      .filter(Boolean);
    const offerIds = leaves
      .filter((b) => b.type === 'offer')
      .map((b) => b.offerId.trim())
      .filter(Boolean);

    if (mediaIds.length > 0) {
      if (!this.mediaAccess) {
        throw new ContentDomainError(
          'Media validation is unavailable.',
          'CONTENT_PAGE_MEDIA_GUARD_UNAVAILABLE',
        );
      }
      for (const mediaId of mediaIds) {
        const resolved = await this.mediaAccess.resolvePublicImageUrl(mediaId);
        if (!resolved) {
          throw new ContentPageMediaNotReadyError(
            `Media asset is missing or not ready for publish: ${mediaId}`,
          );
        }
      }
    }

    if (productIds.length === 0 && offerIds.length === 0) {
      return;
    }
    if (!this.catalogOffers) {
      throw new ContentDomainError(
        'Catalog validation is unavailable.',
        'CONTENT_PAGE_CATALOG_GUARD_UNAVAILABLE',
      );
    }

    for (const productId of productIds) {
      const linked = await this.catalogOffers.listOfferIdsByProductId(productId);
      if (linked.length === 0) {
        throw new ContentPageCatalogEmbedError(
          `Product has no offers for publish: ${productId}`,
        );
      }
      const sources = await this.catalogOffers.loadOfferSources([...linked]);
      const sellable = sources.some(
        (s) => s.offerAvailable && s.productStatus.toLowerCase() === 'published',
      );
      if (!sellable) {
        throw new ContentPageCatalogEmbedError(
          `Product is missing or not sellable for publish: ${productId}`,
        );
      }
    }

    for (const offerId of offerIds) {
      const source = await this.catalogOffers.loadOfferSource(offerId);
      if (
        !source ||
        !source.offerAvailable ||
        source.productStatus.toLowerCase() !== 'published'
      ) {
        throw new ContentPageCatalogEmbedError(
          `Offer is missing or not sellable for publish: ${offerId}`,
        );
      }
    }
  }
}
