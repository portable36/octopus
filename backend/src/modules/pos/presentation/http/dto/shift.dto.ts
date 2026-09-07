import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import type { CashMovementKind } from '../../../domain/aggregates/shift.aggregate';

export class OpeningAdjustmentDto {
  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @MaxLength(200)
  reason!: string;
}

export class OpenShiftRequestDto {
  @IsInt()
  @Min(0)
  openingCashMinor!: number;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OpeningAdjustmentDto)
  adjustment?: OpeningAdjustmentDto;
}

export class RecordMovementRequestDto {
  @IsIn(['CASH_SALE', 'CASH_IN', 'CASH_REFUND', 'CASH_OUT'])
  kind!: CashMovementKind;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @MaxLength(3)
  currency!: string;
}

export class CloseShiftRequestDto {
  @IsInt()
  @Min(0)
  actualCashMinor!: number;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export interface ShiftResponseDto {
  readonly id: string;
  readonly storeId?: string | undefined;
  readonly vendorId?: string | undefined;
  readonly registerId: string;
  readonly cashierId: string;
  readonly status: 'OPEN' | 'CLOSED';
  readonly currency: string;
  readonly openingCashMinor: number;
  readonly openingCashBeforeAdjustmentMinor: number;
  readonly adjustmentAmountMinor?: number | undefined;
  readonly adjustmentReason?: string | undefined;
  readonly totalSalesMinor: number;
  readonly nonCashSalesMinor: number;
  readonly cashSalesMinor: number;
  readonly cashInMinor: number;
  readonly cashRefundsMinor: number;
  readonly cashOutMinor: number;
  readonly expectedCashMinor: number;
  readonly actualCashMinor?: number | undefined;
  readonly differenceMinor?: number | undefined;
  readonly isShort: boolean;
  readonly openedAt: string;
  readonly closedAt?: string | null | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}
