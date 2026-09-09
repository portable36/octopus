import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { CustomerHandlers } from '../../application/commands/customer.handlers';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;
}

class AddressDto {
  @IsString()
  @MaxLength(80)
  label!: string;

  @IsString()
  @MaxLength(200)
  recipientName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsString()
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string | null;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  postalCode?: string | null;

  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

class PatchAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  postalCode?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

class AddWishlistDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsUUID()
  variantId?: string | null;

  @IsOptional()
  @IsUUID()
  storeId?: string | null;
}

class CreateReviewDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsUUID()
  orderId?: string | null;
}

@ApiTags('customer')
@Controller('customer')
@ApiBearerAuth()
export class CustomerController {
  constructor(private readonly customers: CustomerHandlers) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get or create the current customer profile' })
  async getProfile(@CurrentUser() user: RequestPrincipal) {
    const profile = await this.customers.getOrCreateProfile(
      user.userId,
      user.email.split('@')[0] || 'Customer',
    );
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      phone: profile.phone,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update customer profile' })
  async updateProfile(@CurrentUser() user: RequestPrincipal, @Body() body: UpdateProfileDto) {
    const profile = await this.customers.updateProfile(user.userId, {
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
    });
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      phone: profile.phone,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  @Get('addresses')
  @ApiOperation({ summary: 'List address book' })
  async listAddresses(@CurrentUser() user: RequestPrincipal) {
    const addresses = await this.customers.listAddresses(user.userId);
    return addresses.map(addressResponse);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add address' })
  async addAddress(@CurrentUser() user: RequestPrincipal, @Body() body: AddressDto) {
    const address = await this.customers.addAddress(user.userId, body);
    return addressResponse(address);
  }

  @Patch('addresses/:addressId')
  @ApiOperation({ summary: 'Update address' })
  async updateAddress(
    @CurrentUser() user: RequestPrincipal,
    @Param('addressId') addressId: string,
    @Body() body: PatchAddressDto,
  ) {
    const address = await this.customers.updateAddress(user.userId, addressId, body);
    return addressResponse(address);
  }

  @Delete('addresses/:addressId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete address' })
  async deleteAddress(
    @CurrentUser() user: RequestPrincipal,
    @Param('addressId') addressId: string,
  ) {
    await this.customers.deleteAddress(user.userId, addressId);
  }

  @Get('wishlist')
  @ApiOperation({ summary: 'List wishlist items for the current customer' })
  async listWishlist(@CurrentUser() user: RequestPrincipal) {
    const items = await this.customers.listWishlist(user.userId);
    return items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      storeId: item.storeId,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  @Post('wishlist')
  @ApiOperation({ summary: 'Add a product to the wishlist' })
  async addWishlist(@CurrentUser() user: RequestPrincipal, @Body() body: AddWishlistDto) {
    const item = await this.customers.addWishlistItem(user.userId, body);
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      storeId: item.storeId,
      createdAt: item.createdAt.toISOString(),
    };
  }

  @Delete('wishlist/:productId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a product from the wishlist' })
  async removeWishlist(
    @CurrentUser() user: RequestPrincipal,
    @Param('productId') productId: string,
  ) {
    await this.customers.removeWishlistItem(user.userId, productId);
  }

  @Post('reviews')
  @ApiOperation({ summary: 'Create or update a product review' })
  async createReview(@CurrentUser() user: RequestPrincipal, @Body() body: CreateReviewDto) {
    const review = await this.customers.createReview(user.userId, body);
    return reviewResponse(review);
  }

  @Delete('reviews/:reviewId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete own product review' })
  async deleteReview(@CurrentUser() user: RequestPrincipal, @Param('reviewId') reviewId: string) {
    await this.customers.deleteReview(user.userId, reviewId);
  }
}

function addressResponse(address: {
  id: string;
  label: string;
  recipientName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefault: boolean;
  updatedAt: Date;
}) {
  return {
    id: address.id,
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    region: address.region,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
    isDefault: address.isDefault,
    updatedAt: address.updatedAt.toISOString(),
  };
}

function reviewResponse(review: {
  id: string;
  productId: string;
  userId: string;
  orderId: string | null;
  rating: number;
  title: string;
  body: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: review.id,
    productId: review.productId,
    userId: review.userId,
    orderId: review.orderId,
    rating: review.rating,
    title: review.title,
    body: review.body,
    status: review.status,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}
