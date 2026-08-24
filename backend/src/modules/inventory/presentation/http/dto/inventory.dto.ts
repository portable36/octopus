import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateWarehouseRequestDto {
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine?: string | null;
}

export class EnsureInventoryItemRequestDto {
  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  variantId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}

export class ReceiveStockRequestDto {
  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @MaxLength(180)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}

export class AdjustStockRequestDto {
  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  variantId!: string;

  @IsInt()
  delta!: number;

  @IsString()
  @MaxLength(240)
  reason!: string;

  @IsString()
  @MaxLength(180)
  idempotencyKey!: string;
}

export class TransferStockRequestDto {
  @IsUUID()
  sourceWarehouseId!: string;

  @IsUUID()
  destinationWarehouseId!: string;

  @IsUUID()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @MaxLength(180)
  idempotencyKey!: string;
}

export class ReserveStockRequestDto {
  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @MaxLength(120)
  orderId!: string;

  @IsISO8601()
  expiresAt!: string;

  @IsString()
  @MaxLength(180)
  idempotencyKey!: string;
}

export class ReservationActionRequestDto {
  @IsString()
  @MaxLength(180)
  idempotencyKey!: string;
}
