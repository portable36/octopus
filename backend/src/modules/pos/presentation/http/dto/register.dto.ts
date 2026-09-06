import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import type { RegisterStatus } from '../../../domain/aggregates/register.aggregate';

export class CreateRegisterRequestDto {
  @ApiProperty({
    description: 'Unique register code for this store (e.g. REG-01)',
    example: 'REG-01',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 32)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code may only contain alphanumeric characters, hyphens, and underscores',
  })
  code!: string;

  @ApiProperty({
    description: 'Human-readable register name (e.g. Counter 1)',
    example: 'Main Checkout Counter',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional notes or location details',
    example: 'Near front entrance',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string | null;
}

export class UpdateRegisterRequestDto {
  @ApiPropertyOptional({ description: 'Updated register name', example: 'Front Counter A' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated register status',
    enum: ['ACTIVE', 'INACTIVE', 'DECOMMISSIONED'],
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'DECOMMISSIONED'])
  status?: RegisterStatus;

  @ApiPropertyOptional({ description: 'Updated register notes', example: 'Hardware replaced' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string | null;
}

export class RegisterResponseDto {
  @ApiProperty({ example: '0191c0a0-0000-7000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: '0191c0a0-0000-7000-8000-000000000002' })
  storeId!: string;

  @ApiProperty({ example: '0191c0a0-0000-7000-8000-000000000003' })
  vendorId!: string;

  @ApiProperty({ example: 'REG-01' })
  code!: string;

  @ApiProperty({ example: 'Main Checkout Counter' })
  name!: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE', 'DECOMMISSIONED'], example: 'ACTIVE' })
  status!: RegisterStatus;

  @ApiProperty({ nullable: true, example: 'Near front entrance' })
  notes!: string | null;

  @ApiProperty({ example: '2026-09-06T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-06T12:00:00.000Z' })
  updatedAt!: string;
}
