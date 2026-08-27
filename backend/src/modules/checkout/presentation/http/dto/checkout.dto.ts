import { Type } from 'class-transformer';
import {
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

export class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  line1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  postalCode?: string;

  @ApiProperty({ example: 'BD' })
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  countryCode!: string;
}

export class AttributionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  landingPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmTerm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmContent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  gclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fbclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  firstTouchAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  lastTouchAt?: string;
}

export class SubmitCheckoutDto {
  @ApiProperty()
  @IsUUID()
  cartId!: string;

  @ApiProperty({ description: 'Optimistic concurrency token from cart.version' })
  @IsInt()
  @Min(1)
  expectedCartVersion!: number;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(180)
  idempotencyKey!: string;

  @ApiProperty({ enum: ['COD', 'SSLCOMMERZ', 'BKASH', 'NAGAD'] })
  @IsIn(['COD', 'SSLCOMMERZ', 'BKASH', 'NAGAD'])
  paymentMethod!: 'COD' | 'SSLCOMMERZ' | 'BKASH' | 'NAGAD';

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @ApiProperty({ example: 'STANDARD' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  shippingMethod!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  shippingMinor?: number;

  @ApiPropertyOptional({ description: 'Tax rate in basis points' })
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

  @ApiPropertyOptional({ description: 'First/last-touch attribution snapshot' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AttributionDto)
  attribution?: AttributionDto;
}
