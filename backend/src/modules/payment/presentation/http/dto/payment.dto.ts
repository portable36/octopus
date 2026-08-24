import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CollectCodPaymentDto {
  @ApiProperty({ description: 'Exact outstanding amount in minor units' })
  @IsInt()
  @Min(0)
  amountMinor!: number;

  @ApiProperty({ example: 'BDT' })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CollectCodPaymentResponseDto {
  @ApiProperty()
  paymentIntentId!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty({ enum: ['COD'] })
  paymentMethod!: 'COD';

  @ApiProperty({ enum: ['COLLECTED'] })
  status!: 'COLLECTED';

  @ApiProperty()
  amountMinor!: number;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  collectionId!: string;

  @ApiProperty()
  collectedAt!: string;
}

// Keep Type import used for potential nested DTOs
void Type;
