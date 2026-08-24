import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromotionRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED'] })
  @IsIn(['PERCENTAGE', 'FIXED'])
  discountType!: 'PERCENTAGE' | 'FIXED';

  @ApiProperty({ description: 'Percent 1-100 or fixed minor units' })
  @IsInt()
  @Min(1)
  discountValue!: number;

  @ApiProperty({ example: 'BDT' })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currencyCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmountMinor?: number;

  @ApiProperty({ enum: ['ALL', 'PRODUCT', 'CATEGORY', 'VENDOR', 'STORE'] })
  @IsIn(['ALL', 'PRODUCT', 'CATEGORY', 'VENDOR', 'STORE'])
  scope!: 'ALL' | 'PRODUCT' | 'CATEGORY' | 'VENDOR' | 'STORE';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopeIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  perCustomerLimit?: number;

  @ApiProperty()
  @IsDateString()
  startsAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activate?: boolean;
}

export class QuoteLineDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  lineId!: string;

  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  categoryIds!: string[];

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  unitBasePriceMinor!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  unitSalePriceMinor?: number;
}

export class QuoteRequestDto {
  @ApiProperty()
  @IsUUID()
  vendorId!: string;

  @ApiProperty()
  @IsUUID()
  storeId!: string;

  @ApiProperty({ example: 'BDT' })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currencyCode!: string;

  @ApiProperty({ type: [QuoteLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  lines!: QuoteLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  shippingMinor?: number;

  @ApiPropertyOptional({ description: 'Tax rate in basis points (100 = 1%)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  taxRateBps?: number;

  @ApiPropertyOptional({ description: 'Commission rate in basis points' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  commissionRateBps?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class RecordUsageRequestDto {
  @ApiProperty()
  @IsUUID()
  promotionId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  orderId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(180)
  idempotencyKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
