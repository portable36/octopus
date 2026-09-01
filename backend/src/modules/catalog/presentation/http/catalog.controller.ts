import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import {
  CreateProductHandler,
  GetProductHandler,
  ProductLifecycleHandler,
} from '../../application/commands/product.handlers';
import {
  CreateVariantHandler,
  VariantLifecycleHandler,
} from '../../application/commands/variant.handlers';
import {
  CreateCategoryHandler,
  ListCategoriesHandler,
  UpdateCategoryHandler,
} from '../../application/commands/category.handlers';
import {
  CreateStoreOfferHandler,
  StoreOfferLifecycleHandler,
} from '../../application/commands/store-offer.handlers';
import {
  ListProductVariantsHandler,
  ListStoreOffersHandler,
} from '../../application/queries/catalog-vendor.query-handler';
import {
  toAuthoringProductDto,
  toAuthoringStoreOfferDto,
  toAuthoringVariantDto,
} from '../../application/mappers/catalog-response.mapper';
import { CatalogExceptionFilter } from './filters/catalog-exception.filter';
import type { Category } from '../../domain/aggregates/category.aggregate';

class CatalogMediaRefDto {
  @ApiProperty()
  @IsUUID()
  mediaId!: string;

  @ApiProperty({ enum: ['IMAGE', 'VIDEO', 'DOCUMENT', '360_VIEW'] })
  @IsIn(['IMAGE', 'VIDEO', 'DOCUMENT', '360_VIEW'])
  mediaType!: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | '360_VIEW';

  @ApiProperty()
  @IsBoolean()
  isPrimary!: boolean;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [CatalogMediaRefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogMediaRefDto)
  media?: CatalogMediaRefDto[];
}

class CreateProductDto {
  @ApiProperty()
  @IsUUID()
  vendorId!: string;

  @ApiProperty({ example: 'abc-def-1234' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  sku!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}

class CreateVariantDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'abc-def-0001' })
  @IsString()
  sku!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  basePriceMinor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;
}

class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;
}

class CreateStoreOfferDto {
  @ApiProperty()
  @IsUUID()
  storeId!: string;

  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  priceMinor!: number;

  @ApiProperty({ example: 'BDT' })
  @IsString()
  @MaxLength(3)
  currencyCode!: string;
}

class UpdateOfferPriceDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  priceMinor!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;
}

@ApiTags('catalog')
@Controller()
@ApiBearerAuth()
@UseFilters(CatalogExceptionFilter)
export class CatalogController {
  constructor(
    private readonly createProduct: CreateProductHandler,
    private readonly productLifecycle: ProductLifecycleHandler,
    private readonly getProduct: GetProductHandler,
    private readonly listProductVariants: ListProductVariantsHandler,
    private readonly listStoreOffers: ListStoreOffersHandler,
    private readonly createVariant: CreateVariantHandler,
    private readonly variantLifecycle: VariantLifecycleHandler,
    private readonly createCategory: CreateCategoryHandler,
    private readonly updateCategory: UpdateCategoryHandler,
    private readonly listCategories: ListCategoriesHandler,
    private readonly createOffer: CreateStoreOfferHandler,
    private readonly offerLifecycle: StoreOfferLifecycleHandler,
  ) {}

  @Post('products')
  @ApiOperation({ summary: 'Create a draft product for an active vendor' })
  async createProductRoute(@CurrentUser() user: RequestPrincipal, @Body() body: CreateProductDto) {
    const product = await this.createProduct.execute({
      vendorId: body.vendorId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      sku: body.sku,
      name: body.name,
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.brandId !== undefined ? { brandId: body.brandId } : {}),
      ...(body.categoryIds !== undefined ? { categoryIds: body.categoryIds } : {}),
    });
    return toAuthoringProductDto(product);
  }

  @Get('products')
  @ApiQuery({ name: 'vendorId', required: true })
  async listProducts(@CurrentUser() user: RequestPrincipal, @Query('vendorId') vendorId: string) {
    const products = await this.getProduct.forVendor(vendorId, user.userId, user.roles);
    return products.map((product) => toAuthoringProductDto(product));
  }

  @Get('products/:productId')
  async getProductRoute(
    @CurrentUser() user: RequestPrincipal,
    @Param('productId') productId: string,
  ) {
    const product = await this.getProduct.byId(productId, user.userId, user.roles);
    return toAuthoringProductDto(product);
  }

  @Patch('products/:productId')
  @ApiOperation({ summary: 'Update product fields (vendor-scoped, validated)' })
  async updateProductRoute(
    @CurrentUser() user: RequestPrincipal,
    @Param('productId') productId: string,
    @Body() body: UpdateProductDto,
  ) {
    const product = await this.productLifecycle.update(productId, user.userId, user.roles, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.brandId !== undefined ? { brandId: body.brandId } : {}),
      ...(body.categoryIds !== undefined ? { categoryIds: body.categoryIds } : {}),
      ...(body.media !== undefined ? { media: body.media } : {}),
    });
    return toAuthoringProductDto(product);
  }

  @Get('products/:productId/variants')
  @ApiOperation({ summary: 'List variants for a product (vendor or platform admin)' })
  async listVariantsRoute(
    @CurrentUser() user: RequestPrincipal,
    @Param('productId') productId: string,
  ) {
    const variants = await this.listProductVariants.execute(productId, user.userId, user.roles);
    return variants.map((variant) => toAuthoringVariantDto(variant));
  }

  @Get('store-offers')
  @ApiQuery({ name: 'storeId', required: true })
  @ApiQuery({ name: 'productId', required: false })
  @ApiOperation({ summary: 'List store offers for a store (optional product filter)' })
  async listStoreOffersRoute(
    @CurrentUser() user: RequestPrincipal,
    @Query('storeId') storeId: string,
    @Query('productId') productId?: string,
  ) {
    const offers = await this.listStoreOffers.execute({
      storeId,
      ...(productId ? { productId } : {}),
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return offers.map((offer) => toAuthoringStoreOfferDto(offer));
  }

  @Post('products/:productId/submit-review')
  @HttpCode(200)
  async submitReview(@CurrentUser() user: RequestPrincipal, @Param('productId') productId: string) {
    return toAuthoringProductDto(
      await this.productLifecycle.submitForReview(productId, user.userId, user.roles),
    );
  }

  @Post('products/:productId/publish')
  @HttpCode(200)
  async publish(@CurrentUser() user: RequestPrincipal, @Param('productId') productId: string) {
    return toAuthoringProductDto(
      await this.productLifecycle.publish(productId, user.userId, user.roles),
    );
  }

  @Post('products/:productId/unpublish')
  @HttpCode(200)
  async unpublish(@CurrentUser() user: RequestPrincipal, @Param('productId') productId: string) {
    return toAuthoringProductDto(
      await this.productLifecycle.unpublish(productId, user.userId, user.roles),
    );
  }

  @Post('products/:productId/archive')
  @HttpCode(200)
  async archiveProduct(
    @CurrentUser() user: RequestPrincipal,
    @Param('productId') productId: string,
  ) {
    return toAuthoringProductDto(
      await this.productLifecycle.archive(productId, user.userId, user.roles),
    );
  }

  @Post('products/:productId/variants')
  async createVariantRoute(
    @CurrentUser() user: RequestPrincipal,
    @Param('productId') productId: string,
    @Body() body: CreateVariantDto,
  ) {
    const variant = await this.createVariant.execute({
      productId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      name: body.name,
      sku: body.sku,
      ...(body.barcode !== undefined ? { barcode: body.barcode } : {}),
      ...(body.basePriceMinor !== undefined ? { basePriceMinor: body.basePriceMinor } : {}),
      ...(body.currencyCode !== undefined ? { currencyCode: body.currencyCode } : {}),
    });
    return toAuthoringVariantDto(variant);
  }

  @Post('variants/:variantId/activate')
  @HttpCode(200)
  async activateVariant(
    @CurrentUser() user: RequestPrincipal,
    @Param('variantId') variantId: string,
  ) {
    return toAuthoringVariantDto(
      await this.variantLifecycle.activate(variantId, user.userId, user.roles),
    );
  }

  @Post('variants/:variantId/archive')
  @HttpCode(200)
  async archiveVariant(
    @CurrentUser() user: RequestPrincipal,
    @Param('variantId') variantId: string,
  ) {
    return toAuthoringVariantDto(
      await this.variantLifecycle.archive(variantId, user.userId, user.roles),
    );
  }

  @Get('categories')
  async categories() {
    const items = await this.listCategories.execute();
    return items.map((category) => this.categoryResponse(category));
  }

  @Post('categories')
  async createCategoryRoute(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateCategoryDto,
  ) {
    const category = await this.createCategory.execute({
      actorRoles: user.roles,
      name: body.name,
      ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
      ...(body.seoTitle !== undefined ? { seoTitle: body.seoTitle } : {}),
      ...(body.seoDescription !== undefined ? { seoDescription: body.seoDescription } : {}),
    });
    return this.categoryResponse(category);
  }

  @Post('categories/:categoryId/archive')
  @HttpCode(200)
  async archiveCategory(
    @CurrentUser() user: RequestPrincipal,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoryResponse(await this.updateCategory.archive(categoryId, user.roles));
  }

  @Post('store-offers')
  async createOfferRoute(@CurrentUser() user: RequestPrincipal, @Body() body: CreateStoreOfferDto) {
    const offer = await this.createOffer.execute({
      actorUserId: user.userId,
      actorRoles: user.roles,
      storeId: body.storeId,
      variantId: body.variantId,
      priceMinor: body.priceMinor,
      currencyCode: body.currencyCode,
    });
    return toAuthoringStoreOfferDto(offer);
  }

  @Post('store-offers/:offerId/activate')
  @HttpCode(200)
  async activateOffer(@CurrentUser() user: RequestPrincipal, @Param('offerId') offerId: string) {
    return toAuthoringStoreOfferDto(
      await this.offerLifecycle.activate(offerId, user.userId, user.roles),
    );
  }

  @Post('store-offers/:offerId/suspend')
  @HttpCode(200)
  async suspendOffer(@CurrentUser() user: RequestPrincipal, @Param('offerId') offerId: string) {
    return toAuthoringStoreOfferDto(
      await this.offerLifecycle.suspend(offerId, user.userId, user.roles),
    );
  }

  @Patch('store-offers/:offerId/price')
  async updateOfferPrice(
    @CurrentUser() user: RequestPrincipal,
    @Param('offerId') offerId: string,
    @Body() body: UpdateOfferPriceDto,
  ) {
    return toAuthoringStoreOfferDto(
      await this.offerLifecycle.updatePrice(
        offerId,
        user.userId,
        user.roles,
        body.priceMinor,
        body.currencyCode,
      ),
    );
  }

  private categoryResponse(category: Category) {
    return {
      id: category.id.value,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      status: category.status,
      sortOrder: category.sortOrder,
      seo: category.seo,
    };
  }
}
