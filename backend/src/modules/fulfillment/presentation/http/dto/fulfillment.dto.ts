import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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

export class ShipmentLineDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lineId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateShipmentDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty({ enum: ['STEADFAST', 'PATHAO', 'MANUAL'] })
  @IsIn(['STEADFAST', 'PATHAO', 'MANUAL'])
  provider!: 'STEADFAST' | 'PATHAO' | 'MANUAL';

  @ApiProperty({ type: [ShipmentLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShipmentLineDto)
  lines!: ShipmentLineDto[];

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  recipientName!: string;

  @ApiProperty({ example: '017XXXXXXXX' })
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  recipientPhone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(11)
  recipientSecondaryPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(250)
  recipientAddress?: string;

  @ApiPropertyOptional({ default: 0.5 })
  @IsOptional()
  weightKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ description: 'Pathao: 48 normal, 12 on-demand' })
  @IsOptional()
  @IsInt()
  @Min(12)
  @Max(48)
  deliveryType?: number;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(180)
  idempotencyKey!: string;
}

export class MarkDeliveredManualDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingCode?: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(180)
  idempotencyKey!: string;
}
