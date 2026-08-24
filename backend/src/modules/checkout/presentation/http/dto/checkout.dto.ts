import { Type } from 'class-transformer';
import {
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
}
