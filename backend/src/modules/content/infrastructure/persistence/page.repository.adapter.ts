import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { Page } from '../../domain/aggregates/page.aggregate';
import type {
  ContentBlock,
  ContentPageSeo,
  ContentPageStatus,
  PagePublicationSnapshot,
  PublicContentPageDto,
} from '../../domain/content.types';
import type {
  PageListFilter,
  PageListResult,
  PagePublicationListItem,
  PageRepository,
} from '../../application/ports/page-repository.interface';
import { ContentPageOrmEntity } from './content-page.orm-entity';
import { ContentPagePublicationOrmEntity } from './content-page-publication.orm-entity';

function toPage(entity: ContentPageOrmEntity): Page {
  return Page.rehydrate({
    id: entity.id,
    title: entity.title,
    slug: entity.slug,
    status: entity.status as ContentPageStatus,
    draftBody: (entity.draftBody ?? []) as ContentBlock[],
    draftSeo: (entity.draftSeo ?? {}) as ContentPageSeo,
    version: entity.version,
    currentPublicationId: entity.currentPublicationId,
    archivedAt: entity.archivedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    createdBy: entity.createdBy,
    updatedBy: entity.updatedBy,
  });
}

function applyPageToEntity(entity: ContentPageOrmEntity, page: Page): void {
  entity.id = page.id.value;
  entity.title = page.title;
  entity.slug = page.slug;
  entity.status = page.status;
  entity.draftBody = [...page.draftBody] as ContentBlock[];
  entity.draftSeo = { ...page.draftSeo };
  entity.version = page.version;
  entity.currentPublicationId = page.currentPublicationId;
  entity.archivedAt = page.archivedAt;
  entity.createdAt = page.createdAt;
  entity.updatedAt = page.updatedAt;
  entity.createdBy = page.createdBy;
  entity.updatedBy = page.updatedBy;
}

function toPublicationSnapshot(entity: ContentPagePublicationOrmEntity): PagePublicationSnapshot {
  return {
    id: entity.id,
    pageId: entity.pageId,
    title: entity.title,
    slug: entity.slug,
    body: (entity.body ?? []) as ContentBlock[],
    seo: (entity.seo ?? {}) as ContentPageSeo,
    pageVersion: entity.pageVersion,
    publishedAt: entity.publishedAt,
    publishedBy: entity.publishedBy,
    sourcePublicationId: entity.sourcePublicationId,
  };
}

@Injectable()
export class PageRepositoryAdapter implements PageRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(page: Page, publication?: PagePublicationSnapshot | null): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(ContentPageOrmEntity, { id: page.id.value });
      if (!entity) {
        entity = new ContentPageOrmEntity();
      }

      if (publication) {
        // Page row must exist before publication FK; clear current pub until snapshot lands.
        applyPageToEntity(entity, page);
        entity.currentPublicationId = null;
        await tx.persist(entity).flush();

        const pubEntity = new ContentPagePublicationOrmEntity();
        pubEntity.id = publication.id;
        pubEntity.pageId = publication.pageId;
        pubEntity.title = publication.title;
        pubEntity.slug = publication.slug;
        pubEntity.body = [...publication.body] as ContentBlock[];
        pubEntity.seo = { ...publication.seo };
        pubEntity.pageVersion = publication.pageVersion;
        pubEntity.publishedAt = publication.publishedAt;
        pubEntity.publishedBy = publication.publishedBy;
        pubEntity.sourcePublicationId = publication.sourcePublicationId;
        await tx.persist(pubEntity).flush();

        entity.currentPublicationId = page.currentPublicationId;
        await tx.persist(entity).flush();
        return;
      }

      applyPageToEntity(entity, page);
      await tx.persist(entity).flush();
    });
  }

  public async findById(id: string): Promise<Page | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ContentPageOrmEntity, { id });
      return entity ? toPage(entity) : null;
    });
  }

  public async findBySlugActive(slug: string): Promise<Page | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ContentPageOrmEntity, {
        slug,
        archivedAt: null,
      });
      return entity ? toPage(entity) : null;
    });
  }

  public async list(filter: PageListFilter): Promise<PageListResult> {
    return withRlsContext(this.em, async (tx) => {
      const where: Record<string, unknown> = {};
      if (!filter.includeArchived) {
        where.archivedAt = null;
      }
      if (filter.status) {
        where.status = filter.status;
      }
      if (filter.q?.trim()) {
        const q = `%${filter.q.trim()}%`;
        where.$or = [{ title: { $ilike: q } }, { slug: { $ilike: q } }];
      }
      if (filter.cursor?.trim()) {
        const cursorDate = new Date(filter.cursor.trim());
        if (!Number.isNaN(cursorDate.getTime())) {
          where.updatedAt = { $lt: cursorDate };
        }
      }

      const rows = await tx.find(ContentPageOrmEntity, where, {
        orderBy: { updatedAt: 'DESC', id: 'DESC' },
        limit: filter.limit + 1,
      });
      const page = rows.slice(0, filter.limit);
      const next = rows.length > filter.limit ? page[page.length - 1] : null;
      return {
        items: page.map((row) => ({
          id: row.id,
          title: row.title,
          slug: row.slug,
          status: row.status as ContentPageStatus,
          version: row.version,
          updatedAt: row.updatedAt,
          archivedAt: row.archivedAt,
        })),
        nextCursor: next ? next.updatedAt.toISOString() : null,
      };
    });
  }

  public async findPublishedBySlug(slug: string): Promise<PublicContentPageDto | null> {
    return withRlsContext(this.em, async (tx) => {
      const page = await tx.findOne(ContentPageOrmEntity, {
        slug,
        status: 'PUBLISHED',
        archivedAt: null,
      });
      if (!page?.currentPublicationId) {
        return null;
      }
      const publication = await tx.findOne(ContentPagePublicationOrmEntity, {
        id: page.currentPublicationId,
      });
      if (!publication) {
        return null;
      }
      return {
        id: page.id,
        publicationId: publication.id,
        title: publication.title,
        slug: publication.slug,
        body: (publication.body ?? []) as ContentBlock[],
        seo: (publication.seo ?? {}) as ContentPageSeo,
        publishedAt: publication.publishedAt.toISOString(),
      };
    });
  }

  public async findPublicationById(publicationId: string): Promise<PagePublicationSnapshot | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ContentPagePublicationOrmEntity, {
        id: publicationId,
      });
      return entity ? toPublicationSnapshot(entity) : null;
    });
  }

  public async listPublicationsByPageId(
    pageId: string,
  ): Promise<readonly PagePublicationListItem[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        ContentPagePublicationOrmEntity,
        { pageId },
        { orderBy: { publishedAt: 'DESC' } },
      );
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        pageVersion: row.pageVersion,
        publishedAt: row.publishedAt,
        publishedBy: row.publishedBy,
        sourcePublicationId: row.sourcePublicationId,
      }));
    });
  }
}
