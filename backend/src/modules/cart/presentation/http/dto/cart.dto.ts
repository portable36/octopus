import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty()
  @IsUUID()
  storeId!: string;

  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class UpdateCartQuantityDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class RecalculateCartDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @ApiPropertyOptional({ description: 'Refresh line price snapshots from current offers' })
  @IsOptional()
  @IsBoolean()
  refreshSnapshots?: boolean;
}
