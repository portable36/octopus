import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
import {
  MEDIA_ASSET_ACCESS,
  type MediaAssetAccessPort,
} from '../../../../shared-kernel/application/ports/media-asset-access.port';
import { Page } from '../../domain/aggregates/page.aggregate';
import type {
  ContentBlock,
  ContentPageSeo,
  ContentPageStatus,
  PublicContentPageDto,
} from '../../domain/content.types';
import {
  ContentDomainError,
  ContentPageMediaNotReadyError,
  ContentPageNotFoundError,
  ContentPageSlugConflictError,
} from '../../domain/errors/content.errors';
import {
  PAGE_REPOSITORY,
  type PageListFilter,
  type PageListResult,
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

function collectImageMediaIds(body: readonly ContentBlock[]): string[] {
  const ids: string[] = [];
  for (const block of body) {
    if (block.type === 'image' && block.mediaId.trim()) {
      ids.push(block.mediaId.trim());
    }
  }
  return ids;
}

@Injectable()
export class ContentPageHandlers {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pages: PageRepository,
    @Optional()
    @Inject(MEDIA_ASSET_ACCESS)
    private readonly mediaAccess: MediaAssetAccessPort | null = null,
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
    await this.assertMediaReady(page.draftBody);
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

  private async requirePage(id: string): Promise<Page> {
    const page = await this.pages.findById(id);
    if (!page) {
      throw new ContentPageNotFoundError();
    }
    return page;
  }

  private async assertMediaReady(body: readonly ContentBlock[]): Promise<void> {
    const mediaIds = collectImageMediaIds(body);
    if (mediaIds.length === 0) {
      return;
    }
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
}
