import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import { PublicCatalogQueryHandler } from '../../application/queries/public-catalog.query-handler';

class StoreBySlugQueryDto {
  @IsOptional()
  @IsUUID()
  vendorId?: string;
}

@ApiTags('public-catalog')
@Controller('public')
export class PublicCatalogController {
  constructor(private readonly browse: PublicCatalogQueryHandler) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'List active categories (storefront)' })
  listCategories() {
    return this.browse.listCategories();
  }

  @Public()
  @Get('categories/:slug')
  @ApiOperation({ summary: 'Get active category by slug' })
  getCategory(@Param('slug') slug: string) {
    return this.browse.getCategoryBySlug(slug);
  }

  @Public()
  @Get('products/:productId')
  @ApiOperation({ summary: 'Get published product PDP (variants + active offers)' })
  getProduct(@Param('productId') productId: string) {
    return this.browse.getPublishedProduct(productId);
  }

  @Public()
  @Get('stores/by-slug/:slug')
  @ApiOperation({ summary: 'Get active store by slug (optional vendorId to disambiguate)' })
  getStore(@Param('slug') slug: string, @Query() query: StoreBySlugQueryDto) {
    return this.browse.getActiveStoreBySlug(slug, query.vendorId);
  }

  @Public()
  @Get('sitemap/products')
  @ApiOperation({
    summary: 'Published product ids for sitemap (catalog DB; not Meilisearch)',
  })
  listSitemapProducts() {
    return this.browse.listSitemapProducts();
  }
}
