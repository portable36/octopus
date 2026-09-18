import { Body, Controller, Get, Param, Patch, Post, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { ContentPageHandlers } from '../../application/commands/content-page.handlers';
import type { ContentBlock, ContentPageSeo } from '../../domain/content.types';
import { ContentExceptionFilter } from './filters/content-exception.filter';

class CreateContentPageDto {
  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsArray()
  body?: ContentBlock[];

  @IsOptional()
  @IsObject()
  seo?: ContentPageSeo;
}

class PatchContentPageDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsArray()
  body?: ContentBlock[];

  @IsOptional()
  @IsObject()
  seo?: ContentPageSeo;
}

class ExpectedVersionDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

class RollbackContentPageDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsString()
  publicationId!: string;
}

class ListContentPagesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'UNPUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';

  @IsOptional()
  @IsString()
  includeArchived?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}

@ApiTags('admin-content-pages')
@Controller('admin/content/pages')
@ApiBearerAuth()
@UseFilters(ContentExceptionFilter)
export class AdminContentPagesController {
  constructor(private readonly handlers: ContentPageHandlers) {}

  @Get()
  @RequirePermissions('website.read')
  @ApiOperation({ summary: 'List CMS content pages' })
  async list(@Query() query: ListContentPagesQueryDto) {
    const result = await this.handlers.list({
      limit: query.limit ?? 50,
      cursor: query.cursor ?? null,
      q: query.q ?? null,
      status: query.status ?? null,
      includeArchived: query.includeArchived === 'true' || query.includeArchived === '1',
    });
    return {
      items: result.items.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        status: item.status,
        version: item.version,
        updatedAt: item.updatedAt.toISOString(),
        archivedAt: item.archivedAt?.toISOString() ?? null,
      })),
      nextCursor: result.nextCursor,
    };
  }

  @Post()
  @RequirePermissions('website.update')
  @ApiOperation({ summary: 'Create a CMS content page draft' })
  async create(@CurrentUser() user: RequestPrincipal, @Body() body: CreateContentPageDto) {
    return this.handlers.create({
      title: body.title,
      slug: body.slug,
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.seo !== undefined ? { seo: body.seo } : {}),
      actorUserId: user.userId,
    });
  }

  @Get(':id')
  @RequirePermissions('website.read')
  @ApiOperation({ summary: 'Get a CMS content page by id' })
  async get(@Param('id') id: string) {
    return this.handlers.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('website.update')
  @ApiOperation({ summary: 'Update CMS content page draft fields' })
  async patch(
    @CurrentUser() user: RequestPrincipal,
    @Param('id') id: string,
    @Body() body: PatchContentPageDto,
  ) {
    return this.handlers.update({
      id,
      expectedVersion: body.expectedVersion,
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.slug !== undefined ? { slug: body.slug } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.seo !== undefined ? { seo: body.seo } : {}),
      actorUserId: user.userId,
    });
  }

  @Post(':id/archive')
  @RequirePermissions('website.update')
  @ApiOperation({ summary: 'Archive a CMS content page' })
  async archive(
    @CurrentUser() user: RequestPrincipal,
    @Param('id') id: string,
    @Body() body: ExpectedVersionDto,
  ) {
    return this.handlers.archive({
      id,
      expectedVersion: body.expectedVersion,
      actorUserId: user.userId,
    });
  }

  @Post(':id/publish')
  @RequirePermissions('website.publish')
  @ApiOperation({ summary: 'Publish a CMS content page draft' })
  async publish(
    @CurrentUser() user: RequestPrincipal,
    @Param('id') id: string,
    @Body() body: ExpectedVersionDto,
  ) {
    return this.handlers.publish({
      id,
      expectedVersion: body.expectedVersion,
      actorUserId: user.userId,
    });
  }

  @Post(':id/unpublish')
  @RequirePermissions('website.publish')
  @ApiOperation({ summary: 'Unpublish a CMS content page' })
  async unpublish(
    @CurrentUser() user: RequestPrincipal,
    @Param('id') id: string,
    @Body() body: ExpectedVersionDto,
  ) {
    return this.handlers.unpublish({
      id,
      expectedVersion: body.expectedVersion,
      actorUserId: user.userId,
    });
  }

  @Get(':id/publications')
  @RequirePermissions('website.read')
  @ApiOperation({ summary: 'List publication history for a CMS content page' })
  async listPublications(@Param('id') id: string) {
    const items = await this.handlers.listPublications(id);
    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        pageVersion: item.pageVersion,
        publishedAt: item.publishedAt.toISOString(),
        publishedBy: item.publishedBy,
        sourcePublicationId: item.sourcePublicationId,
      })),
    };
  }

  @Post(':id/rollback')
  @RequirePermissions('website.publish')
  @ApiOperation({ summary: 'Rollback a CMS content page to a prior publication' })
  async rollback(
    @CurrentUser() user: RequestPrincipal,
    @Param('id') id: string,
    @Body() body: RollbackContentPageDto,
  ) {
    return this.handlers.rollback({
      id,
      expectedVersion: body.expectedVersion,
      publicationId: body.publicationId,
      actorUserId: user.userId,
    });
  }
}
