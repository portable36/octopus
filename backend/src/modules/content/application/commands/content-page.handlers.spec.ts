import { describe, expect, it } from 'vitest';
import type {
  MediaAssetAccessPort,
  MediaAssetSnapshot,
  MediaPublicUrlSnapshot,
} from '../../../../shared-kernel/application/ports/media-asset-access.port';
import { Page } from '../../domain/aggregates/page.aggregate';
import type { PagePublicationSnapshot, PublicContentPageDto } from '../../domain/content.types';
import {
  ContentPageNotFoundError,
  ContentPageVersionConflictError,
} from '../../domain/errors/content.errors';
import type {
  PageListFilter,
  PageListResult,
  PageRepository,
} from '../ports/page-repository.interface';
import { ContentPageHandlers } from './content-page.handlers';

class InMemoryPageRepository implements PageRepository {
  private pages = new Map<string, Page>();
  private publications = new Map<string, PagePublicationSnapshot>();

  async save(page: Page, publication?: PagePublicationSnapshot | null): Promise<void> {
    if (publication) {
      this.publications.set(publication.id, publication);
    }
    this.pages.set(
      page.id.value,
      Page.rehydrate({
        id: page.id.value,
        title: page.title,
        slug: page.slug,
        status: page.status,
        draftBody: page.draftBody,
        draftSeo: page.draftSeo,
        version: page.version,
        currentPublicationId: page.currentPublicationId,
        archivedAt: page.archivedAt,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        createdBy: page.createdBy,
        updatedBy: page.updatedBy,
      }),
    );
  }

  async findById(id: string): Promise<Page | null> {
    return this.pages.get(id) ?? null;
  }

  async findBySlugActive(slug: string): Promise<Page | null> {
    for (const page of this.pages.values()) {
      if (page.slug === slug && !page.archivedAt) {
        return page;
      }
    }
    return null;
  }

  async list(filter: PageListFilter): Promise<PageListResult> {
    let items = [...this.pages.values()];
    if (!filter.includeArchived) {
      items = items.filter((p) => !p.archivedAt);
    }
    if (filter.status) {
      items = items.filter((p) => p.status === filter.status);
    }
    if (filter.q?.trim()) {
      const q = filter.q.trim().toLowerCase();
      items = items.filter(
        (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
      );
    }
    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const page = items.slice(0, filter.limit);
    return {
      items: page.map((p) => ({
        id: p.id.value,
        title: p.title,
        slug: p.slug,
        status: p.status,
        version: p.version,
        updatedAt: p.updatedAt,
        archivedAt: p.archivedAt,
      })),
      nextCursor: null,
    };
  }

  async findPublishedBySlug(slug: string): Promise<PublicContentPageDto | null> {
    for (const page of this.pages.values()) {
      if (
        page.slug === slug &&
        page.status === 'PUBLISHED' &&
        !page.archivedAt &&
        page.currentPublicationId
      ) {
        const pub = this.publications.get(page.currentPublicationId);
        if (!pub) {
          return null;
        }
        return {
          id: page.id.value,
          publicationId: pub.id,
          title: pub.title,
          slug: pub.slug,
          body: pub.body,
          seo: pub.seo,
          publishedAt: pub.publishedAt.toISOString(),
        };
      }
    }
    return null;
  }

  async findPublicationById(publicationId: string): Promise<PagePublicationSnapshot | null> {
    return this.publications.get(publicationId) ?? null;
  }
}

class StubMediaAccess implements MediaAssetAccessPort {
  constructor(private readonly readyIds: ReadonlySet<string>) {}

  async findById(mediaId: string): Promise<MediaAssetSnapshot | null> {
    if (!this.readyIds.has(mediaId)) {
      return null;
    }
    return { id: mediaId, contentType: 'image/png', vendorId: null, storeId: null };
  }

  async resolvePublicImageUrl(mediaId: string): Promise<MediaPublicUrlSnapshot | null> {
    if (!this.readyIds.has(mediaId)) {
      return null;
    }
    return {
      id: mediaId,
      contentType: 'image/png',
      url: `https://cdn.example/${mediaId}`,
      expiresAt: null,
    };
  }
}

describe('ContentPageHandlers SC-004', () => {
  it('create → publish → public read; unpublish → not found; version conflict', async () => {
    const repo = new InMemoryPageRepository();
    const handlers = new ContentPageHandlers(repo, new StubMediaAccess(new Set()), null);

    const created = await handlers.create({
      title: 'Shipping',
      slug: 'shipping',
      body: [{ type: 'paragraph', text: 'Draft only' }],
      seo: { metaTitle: 'Draft SEO' },
      actorUserId: 'admin-1',
    });
    expect(created.status).toBe('DRAFT');
    expect(created.version).toBe(1);

    await expect(handlers.getPublishedBySlug('shipping')).rejects.toBeInstanceOf(
      ContentPageNotFoundError,
    );

    const published = await handlers.publish({
      id: created.id,
      expectedVersion: 1,
      actorUserId: 'admin-1',
    });
    expect(published.status).toBe('PUBLISHED');
    expect(published.version).toBe(2);

    const publicDto = await handlers.getPublishedBySlug('shipping');
    expect(publicDto.title).toBe('Shipping');
    expect(publicDto.body).toEqual([{ type: 'paragraph', text: 'Draft only' }]);
    expect(publicDto).not.toHaveProperty('draftBody');
    expect(publicDto).not.toHaveProperty('draftSeo');
    expect(Object.keys(publicDto).sort()).toEqual(
      ['body', 'id', 'publicationId', 'publishedAt', 'seo', 'slug', 'title'].sort(),
    );

    await handlers.update({
      id: created.id,
      expectedVersion: 2,
      body: [{ type: 'paragraph', text: 'New draft text' }],
      actorUserId: 'admin-1',
    });
    const stillLive = await handlers.getPublishedBySlug('shipping');
    expect(stillLive.body).toEqual([{ type: 'paragraph', text: 'Draft only' }]);

    await expect(
      handlers.publish({
        id: created.id,
        expectedVersion: 2,
        actorUserId: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(ContentPageVersionConflictError);

    const unpublished = await handlers.unpublish({
      id: created.id,
      expectedVersion: 3,
      actorUserId: 'admin-1',
    });
    expect(unpublished.status).toBe('UNPUBLISHED');
    await expect(handlers.getPublishedBySlug('shipping')).rejects.toBeInstanceOf(
      ContentPageNotFoundError,
    );
  });
});
