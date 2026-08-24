import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateReceiptTemplateRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  addressLines?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  website?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  headerLines?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  footerLines?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(400)
  thankYouText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  returnsPolicyText?: string;

  @IsOptional()
  @IsBoolean()
  showSku?: boolean;

  @IsOptional()
  @IsBoolean()
  showTax?: boolean;

  @IsOptional()
  @IsIn([58, 80])
  paperWidth?: 58 | 80;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  logoMediaId?: string | null;
}

export class ReceiptSaleLineDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string | null;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsInt()
  @Min(0)
  lineTotalMinor!: number;
}

export class ReceiptPaymentLineDto {
  @IsString()
  @MaxLength(40)
  method!: string;

  @IsInt()
  @Min(0)
  amountPaidMinor!: number;
}

export class CreateReceiptRequestDto {
  @IsUUID()
  saleId!: string;

  @IsISO8601()
  soldAt!: string;

  @IsString()
  @MaxLength(120)
  cashierName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  registerCode?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiptSaleLineDto)
  lines!: ReceiptSaleLineDto[];

  @IsInt()
  @Min(0)
  subtotalMinor!: number;

  @IsInt()
  @Min(0)
  discountMinor!: number;

  @IsInt()
  @Min(0)
  taxMinor!: number;

  @IsInt()
  @Min(0)
  totalMinor!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiptPaymentLineDto)
  payments!: ReceiptPaymentLineDto[];

  @IsInt()
  @Min(0)
  changeMinor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;
}
