import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterVendorRequestDto {
  @ApiProperty({ example: 'Dhaka Fresh Foods' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  displayName!: string;

  @ApiProperty({ example: 'Dhaka Fresh Foods Ltd' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  legalName!: string;

  @ApiProperty({ example: 'ops@dhakafresh.example' })
  @IsEmail()
  contactEmail!: string;

  @ApiPropertyOptional({ example: 'BD' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  taxId?: string;
}

export class AdminRegisterVendorRequestDto extends RegisterVendorRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  ownerUserId!: string;
}

export class RejectVendorRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class SuspendVendorRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class AddVendorStaffRequestDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: ['VENDOR_OWNER', 'VENDOR_STAFF'] })
  @IsIn(['VENDOR_OWNER', 'VENDOR_STAFF'])
  role!: 'VENDOR_OWNER' | 'VENDOR_STAFF';
}

export class UpdateVendorProfileRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;
}

export class UpdateVendorSettingsRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsOnlineOrders?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  codEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  codMinAmountMinor?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  codMaxAmountMinor?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  codReservationTtlHours?: number;
}
