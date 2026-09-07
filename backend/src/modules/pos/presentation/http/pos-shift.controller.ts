import { Body, Controller, Get, HttpCode, Param, Post, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { ShiftHandler, type StoreBalancingSummary } from '../../application/commands/shift.handler';
import type { Shift } from '../../domain/aggregates/shift.aggregate';
import {
  CloseShiftRequestDto,
  OpenShiftRequestDto,
  RecordMovementRequestDto,
  type ShiftResponseDto,
} from './dto/shift.dto';
import { PosExceptionFilter } from './filters/pos-exception.filter';

@ApiTags('pos-shifts')
@Controller('pos')
@ApiBearerAuth()
@UseFilters(PosExceptionFilter)
export class PosShiftController {
  constructor(private readonly shiftHandler: ShiftHandler) {}

  @Get('stores/:storeId/balancing')
  @ApiOperation({
    summary: 'Get multi-register cashier balancing summary across all store registers',
  })
  async getStoreBalancing(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
  ): Promise<StoreBalancingSummary> {
    return this.shiftHandler.getStoreBalancingSummary(storeId, user.userId, user.roles);
  }

  @Post('stores/:storeId/registers/:registerId/shifts/open')
  @ApiOperation({ summary: 'Open a new cashier shift on a register' })
  async openShift(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Param('registerId') registerId: string,
    @Body() body: OpenShiftRequestDto,
  ): Promise<ShiftResponseDto> {
    const shift = await this.shiftHandler.openShift({
      storeId,
      registerId,
      cashierId: user.userId,
      openingCashMinor: body.openingCashMinor,
      currency: body.currency,
      adjustment: body.adjustment
        ? {
            amountMinor: body.adjustment.amountMinor,
            reason: body.adjustment.reason,
            actorId: user.userId,
          }
        : undefined,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.toResponseDto(shift);
  }

  @Get('stores/:storeId/registers/:registerId/shifts/active')
  @ApiOperation({ summary: 'Get current active shift for a register' })
  async getActiveShift(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Param('registerId') registerId: string,
  ): Promise<ShiftResponseDto | null> {
    const shift = await this.shiftHandler.getActiveShift(
      storeId,
      registerId,
      user.userId,
      user.roles,
    );
    return shift ? this.toResponseDto(shift) : null;
  }

  @Post('stores/:storeId/shifts/:shiftId/movements')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record a cash movement (in, out, drop, refund) on an open shift' })
  async recordCashMovement(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Param('shiftId') shiftId: string,
    @Body() body: RecordMovementRequestDto,
  ): Promise<ShiftResponseDto> {
    const shift = await this.shiftHandler.recordCashMovement({
      storeId,
      shiftId,
      kind: body.kind,
      amountMinor: body.amountMinor,
      currency: body.currency,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.toResponseDto(shift);
  }

  @Post('stores/:storeId/shifts/:shiftId/close')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Close a cashier shift with counted actual cash and compute balancing variance',
  })
  async closeShift(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Param('shiftId') shiftId: string,
    @Body() body: CloseShiftRequestDto,
  ): Promise<ShiftResponseDto> {
    const shift = await this.shiftHandler.closeShift({
      storeId,
      shiftId,
      actualCashMinor: body.actualCashMinor,
      currency: body.currency,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.toResponseDto(shift);
  }

  private toResponseDto(shift: Shift): ShiftResponseDto {
    return {
      id: shift.id.value,
      storeId: shift.storeId,
      vendorId: shift.vendorId,
      registerId: shift.registerId,
      cashierId: shift.cashierId,
      status: shift.status,
      currency: shift.openingCash.currency,
      openingCashMinor: shift.openingCash.amountMinorUnits,
      openingCashBeforeAdjustmentMinor: shift.openingCashBeforeAdjustment.amountMinorUnits,
      adjustmentAmountMinor: shift.openingBalanceAdjustment?.amount.amountMinorUnits,
      adjustmentReason: shift.openingBalanceAdjustment?.reason,
      totalSalesMinor: shift.totalSales.amountMinorUnits,
      nonCashSalesMinor: shift.nonCashSales.amountMinorUnits,
      cashSalesMinor: shift.cashSales.amountMinorUnits,
      cashInMinor: shift.cashIn.amountMinorUnits,
      cashRefundsMinor: shift.cashRefunds.amountMinorUnits,
      cashOutMinor: shift.cashOut.amountMinorUnits,
      expectedCashMinor: shift.expectedCash.amountMinorUnits,
      actualCashMinor: shift.actualCash?.amountMinorUnits,
      differenceMinor: shift.difference?.amountMinorUnits,
      isShort: shift.isShort,
      openedAt: shift.openedAt.toISOString(),
      closedAt: shift.closedAt?.toISOString() ?? null,
      createdAt: shift.createdAt.toISOString(),
      updatedAt: shift.updatedAt.toISOString(),
    };
  }
}
