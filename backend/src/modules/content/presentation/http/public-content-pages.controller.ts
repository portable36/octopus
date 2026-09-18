import { Controller, Get, Param, UseFilters } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import { ContentPageHandlers } from '../../application/commands/content-page.handlers';
import { ContentExceptionFilter } from './filters/content-exception.filter';

@ApiTags('storefront-content-pages')
@Controller('storefront/content/pages')
@UseFilters(ContentExceptionFilter)
export class PublicContentPagesController {
  constructor(private readonly handlers: ContentPageHandlers) {}

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a published CMS content page by slug' })
  async getBySlug(@Param('slug') slug: string) {
    return this.handlers.getPublishedBySlug(slug);
  }
}
