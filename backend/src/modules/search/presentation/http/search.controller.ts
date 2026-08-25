import { BadGatewayException, Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import {
  PRODUCT_SEARCH_INDEX,
  type ProductSearchIndexPort,
} from '../../application/ports/product-search-index.port';
import type { SearchStockStatus } from '../../domain/search.types';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import { tryGetTenantContext } from '../../../../shared-kernel/infrastructure/context/tenant-context.storage';

class SearchProductsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPriceMinor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceMinor?: number;

  @IsOptional()
  @IsIn(['IN_STOCK', 'OUT_OF_STOCK', 'UNKNOWN'])
  stockStatus?: SearchStockStatus;

  @IsOptional()
  @IsIn(['relevance', 'price_asc', 'price_desc', 'newest'])
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(@Inject(PRODUCT_SEARCH_INDEX) private readonly searchIndex: ProductSearchIndexPort) {}

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Search sellable store offers (Meilisearch read model)' })
  async searchProducts(@Query() query: SearchProductsQueryDto) {
    const scoped = applyServerScope(query);
    try {
      return await this.searchIndex.search(scoped);
    } catch {
      throw new BadGatewayException({
        type: 'about:blank',
        title: 'Search Unavailable',
        status: 502,
        detail: 'Product search is temporarily unavailable.',
        code: 'SEARCH_UNAVAILABLE',
      });
    }
  }
}

/** Tenant context (from validated x-vendor-id / x-store-id) wins over client query params. */
export function applyServerScope(query: SearchProductsQueryDto): {
  q?: string;
  vendorId?: string;
  storeId?: string;
  categoryId?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  stockStatus?: SearchStockStatus;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  limit?: number;
} {
  const ctx = tryGetTenantContext();
  const vendorId = ctx?.vendorId ?? query.vendorId;
  const storeId = ctx?.storeId ?? query.storeId;
  return {
    ...(query.q !== undefined ? { q: query.q } : {}),
    ...(vendorId !== undefined ? { vendorId } : {}),
    ...(storeId !== undefined ? { storeId } : {}),
    ...(query.categoryId !== undefined ? { categoryId: query.categoryId } : {}),
    ...(query.minPriceMinor !== undefined ? { minPriceMinor: query.minPriceMinor } : {}),
    ...(query.maxPriceMinor !== undefined ? { maxPriceMinor: query.maxPriceMinor } : {}),
    ...(query.stockStatus !== undefined ? { stockStatus: query.stockStatus } : {}),
    ...(query.sort !== undefined ? { sort: query.sort } : {}),
    ...(query.page !== undefined ? { page: query.page } : {}),
    ...(query.limit !== undefined ? { limit: query.limit } : {}),
  };
}
