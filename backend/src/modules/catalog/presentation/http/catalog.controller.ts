import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
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
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
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
import { CategoryNotFoundError } from '../../application/errors/catalog.errors';
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

class VariantDimensionsDto {
  @ApiProperty({ example: 150 })
  @IsInt()
  @Min(0)
  lengthMillimeters!: number;

  @ApiProperty({ example: 75 })
  @IsInt()
  @Min(0)
  widthMillimeters!: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  heightMillimeters!: number;
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

  @ApiPropertyOptional({ example: 250, description: 'Weight in grams' })
  @IsOptional()
  @IsInt()
  @Min(0)
  weightGrams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => VariantDimensionsDto)
  dimensions?: VariantDimensionsDto;

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

class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  seoTitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  seoDescription?: string | null;
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
    @Inject(CreateProductHandler) private readonly createProduct: CreateProductHandler,
    @Inject(ProductLifecycleHandler) private readonly productLifecycle: ProductLifecycleHandler,
    @Inject(GetProductHandler) private readonly getProduct: GetProductHandler,
    @Inject(ListProductVariantsHandler)
    private readonly listProductVariants: ListProductVariantsHandler,
    @Inject(ListStoreOffersHandler) private readonly listStoreOffers: ListStoreOffersHandler,
    @Inject(CreateVariantHandler) private readonly createVariant: CreateVariantHandler,
    @Inject(VariantLifecycleHandler) private readonly variantLifecycle: VariantLifecycleHandler,
    @Inject(CreateCategoryHandler) private readonly createCategory: CreateCategoryHandler,
    @Inject(UpdateCategoryHandler) private readonly updateCategory: UpdateCategoryHandler,
    @Inject(ListCategoriesHandler) private readonly listCategories: ListCategoriesHandler,
    @Inject(CreateStoreOfferHandler) private readonly createOffer: CreateStoreOfferHandler,
    @Inject(StoreOfferLifecycleHandler) private readonly offerLifecycle: StoreOfferLifecycleHandler,
  ) {}

  @Post('products')
  @RequirePermissions('catalog.product.create')
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
  @RequirePermissions('catalog.product.read')
  @ApiQuery({ name: 'vendorId', required: true })
  async listProducts(@CurrentUser() user: RequestPrincipal, @Query('vendorId') vendorId: string) {
    const products = await this.getProduct.forVendor(vendorId, user.userId, user.roles);
    return products.map((product) => toAuthoringProductDto(product));
  }

  @Get('products/:productId')
  @RequirePermissions('catalog.product.read')
  async getProductRoute(
    @CurrentUser() user: RequestPrincipal,
    @Param('productId') productId: string,
  ) {
    const product = await this.getProduct.byId(productId, user.userId, user.roles);
    return toAuthoringProductDto(product);
  }

  @Patch('products/:productId')
  @RequirePermissions('catalog.product.update')
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
  @RequirePermissions('catalog.product.read')
  @ApiOperation({ summary: 'List variants for a product (vendor or platform admin)' })
  async listVariantsRoute(
    @CurrentUser() user: RequestPrincipal,
    @Param('productId') productId: string,
  ) {
    const variants = await this.listProductVariants.execute(productId, user.userId, user.roles);
    return variants.map((variant) => toAuthoringVariantDto(variant));
  }

  @Get('store-offers')
  @RequirePermissions('catalog.product.read')
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
  @RequirePermissions('catalog.product.update')
  @HttpCode(200)
  async submitReview(@CurrentUser() user: RequestPrincipal, @Param('productId') productId: string) {
    return toAuthoringProductDto(
      await this.productLifecycle.submitForReview(productId, user.userId, user.roles),
    );
  }

  @Post('products/:productId/publish')
  @RequirePermissions('catalog.product.update')
  @HttpCode(200)
  async publish(@CurrentUser() user: RequestPrincipal, @Param('productId') productId: string) {
    return toAuthoringProductDto(
      await this.productLifecycle.publish(productId, user.userId, user.roles),
    );
  }

  @Post('products/:productId/unpublish')
  @RequirePermissions('catalog.product.update')
  @HttpCode(200)
  async unpublish(@CurrentUser() user: RequestPrincipal, @Param('productId') productId: string) {
    return toAuthoringProductDto(
      await this.productLifecycle.unpublish(productId, user.userId, user.roles),
    );
  }

  @Post('products/:productId/archive')
  @RequirePermissions('catalog.product.update')
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
  @RequirePermissions('catalog.product.create')
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
      ...(body.weightGrams !== undefined ? { weightGrams: body.weightGrams } : {}),
      ...(body.dimensions !== undefined ? { dimensions: body.dimensions } : {}),
      ...(body.basePriceMinor !== undefined ? { basePriceMinor: body.basePriceMinor } : {}),
      ...(body.currencyCode !== undefined ? { currencyCode: body.currencyCode } : {}),
    });
    return toAuthoringVariantDto(variant);
  }

  @Post('variants/:variantId/activate')
  @RequirePermissions('catalog.product.update')
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
  @RequirePermissions('catalog.product.update')
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
  @RequirePermissions('catalog.product.read')
  async categories() {
    const items = await this.listCategories.execute();
    return items.map((category) => this.categoryResponse(category));
  }

  @Get('categories/:categoryId')
  @RequirePermissions('catalog.product.read')
  async getCategoryById(@Param('categoryId') categoryId: string) {
    const category = await this.listCategories.byId(categoryId);
    if (!category) {
      throw new CategoryNotFoundError();
    }
    return this.categoryResponse(category);
  }

  @Post('categories')
  @RequirePermissions('platform.vendors.write')
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

  @Patch('categories/:categoryId')
  @RequirePermissions('platform.vendors.write')
  async updateCategoryRoute(
    @CurrentUser() user: RequestPrincipal,
    @Param('categoryId') categoryId: string,
    @Body() body: UpdateCategoryDto,
  ) {
    const category = await this.updateCategory.update(categoryId, user.roles, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.seoTitle !== undefined ? { seoTitle: body.seoTitle } : {}),
      ...(body.seoDescription !== undefined ? { seoDescription: body.seoDescription } : {}),
    });
    return this.categoryResponse(category);
  }

  @Post('categories/:categoryId/archive')
  @RequirePermissions('platform.vendors.write')
  @HttpCode(200)
  async archiveCategory(
    @CurrentUser() user: RequestPrincipal,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoryResponse(await this.updateCategory.archive(categoryId, user.roles));
  }

  @Post('store-offers')
  @RequirePermissions('catalog.product.create')
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
  @RequirePermissions('catalog.product.update')
  @HttpCode(200)
  async activateOffer(@CurrentUser() user: RequestPrincipal, @Param('offerId') offerId: string) {
    return toAuthoringStoreOfferDto(
      await this.offerLifecycle.activate(offerId, user.userId, user.roles),
    );
  }

  @Post('store-offers/:offerId/suspend')
  @RequirePermissions('catalog.product.update')
  @HttpCode(200)
  async suspendOffer(@CurrentUser() user: RequestPrincipal, @Param('offerId') offerId: string) {
    return toAuthoringStoreOfferDto(
      await this.offerLifecycle.suspend(offerId, user.userId, user.roles),
    );
  }

  @Patch('store-offers/:offerId/price')
  @RequirePermissions('catalog.product.update')
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
