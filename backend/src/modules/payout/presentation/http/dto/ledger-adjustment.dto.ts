import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLedgerAdjustmentDto {
  @IsUUID()
  storeId!: string;

  @IsIn(['CREDIT', 'DEBIT'])
  direction!: 'CREDIT' | 'DEBIT';

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currencyCode!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  /** Defaults to true (hits available immediately). */
  @IsOptional()
  @IsBoolean()
  availableImmediately?: boolean;
}
