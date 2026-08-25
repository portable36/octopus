import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class RequestPayoutDto {
  @IsUUID()
  storeId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currencyCode?: string;
}

export class RejectPayoutDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
