import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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

export class CreateStoreRequestDto {
  @ApiProperty()
  @IsUUID()
  vendorId!: string;

  @ApiProperty({ example: 'Gulshan Branch' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'BDT' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional({ example: 'Asia/Dhaka' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ example: 'en-BD' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;

  @ApiPropertyOptional({ example: 'BD' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;
}

export class SuspendStoreRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class AddStoreStaffRequestDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: ['STORE_MANAGER', 'STORE_STAFF'] })
  @IsIn(['STORE_MANAGER', 'STORE_STAFF'])
  role!: 'STORE_MANAGER' | 'STORE_STAFF';
}

export class UpdateStoreProfileRequestDto {
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
}

export class UpdateStoreAddressRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  line1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  line2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;
}

export class UpdateStoreSettingsRequestDto {
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
  @IsString()
  @MaxLength(16)
  locale?: string;

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

export class CreateStoreDraftRequestDto {
  @ApiProperty()
  @IsUUID()
  vendorId!: string;
}

export class UpdateStoreDraftRequestDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 17 })
  @IsOptional()
  @IsInt()
  @Min(1)
  currentStep?: number;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  payload?: Record<string, unknown>;
}

export class MaintenanceStoreRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

const ADMIN_STORE_STATUSES = [
  'draft',
  'provisioning',
  'failed',
  'active',
  'suspended',
  'maintenance',
  'archived',
  'closed',
] as const;

const ADMIN_STORE_TYPES = [
  'online',
  'physical',
  'online_physical',
  'warehouse',
  'outlet',
  'pickup_point',
  'popup',
  'marketplace',
] as const;

const ADMIN_STORE_SORTS = ['createdAt_desc', 'createdAt_asc', 'name_asc', 'name_desc'] as const;

export class AdminListStoresQueryDto {
  @ApiPropertyOptional({ description: 'Search name, storeCode, slug, vendor name, email, phone' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated statuses (e.g. provisioning,failed)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ enum: ADMIN_STORE_TYPES })
  @IsOptional()
  @IsIn([...ADMIN_STORE_TYPES])
  storeType?: (typeof ADMIN_STORE_TYPES)[number];

  @ApiPropertyOptional({ example: 'BD' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: ADMIN_STORE_SORTS, default: 'createdAt_desc' })
  @IsOptional()
  @IsIn([...ADMIN_STORE_SORTS])
  sort?: (typeof ADMIN_STORE_SORTS)[number];
}

export { ADMIN_STORE_STATUSES };
