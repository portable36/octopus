import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { clampLimit, clampOffset } from '../../../../shared-kernel/presentation/http/pagination';
import type { VendorPayout } from '../../domain/aggregates/vendor-payout.aggregate';
import { PayoutCommandHandler } from '../../application/commands/payout.handlers';
import { RejectPayoutDto, RequestPayoutDto } from './dto/payout.dto';
import { PayoutExceptionFilter } from './filters/payout-exception.filter';

function requireIdempotencyKey(header?: string): string {
  const key = header?.trim();
  if (!key || key.length < 8) {
    throw new BadRequestException({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'Idempotency-Key header is required (min 8 characters).',
      code: 'IDEMPOTENCY_KEY_REQUIRED',
    });
  }
  return key;
}

function toResponse(payout: VendorPayout) {
  return {
    id: payout.id.value,
    vendorId: payout.vendorId,
    storeId: payout.storeId,
    amountMinor: payout.amountMinor,
    currencyCode: payout.currencyCode,
    status: payout.status,
    rejectionReason: payout.rejectionReason,
    failureReason: payout.failureReason,
    providerRef: payout.providerRef,
    ledgerEntryId: payout.ledgerEntryId,
    requestedAt: payout.requestedAt.toISOString(),
    reviewedAt: payout.reviewedAt?.toISOString() ?? null,
    approvedAt: payout.approvedAt?.toISOString() ?? null,
    processingAt: payout.processingAt?.toISOString() ?? null,
    completedAt: payout.completedAt?.toISOString() ?? null,
    failedAt: payout.failedAt?.toISOString() ?? null,
    createdAt: payout.createdAt.toISOString(),
    updatedAt: payout.updatedAt.toISOString(),
  };
}

@ApiTags('finance')
@Controller('finance')
@ApiBearerAuth()
@UseFilters(PayoutExceptionFilter)
export class PayoutController {
  constructor(private readonly payouts: PayoutCommandHandler) {}

  @Post('vendors/:vendorId/payouts')
  @HttpCode(201)
  @ApiOperation({ summary: 'Request a vendor payout (≤ available − reserved)' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  async request(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: RequestPayoutDto,
    @Headers('idempotency-key') idempotencyHeader?: string,
  ) {
    const payout = await this.payouts.requestPayout({
      vendorId,
      storeId: body.storeId,
      amountMinor: body.amountMinor,
      ...(body.currencyCode !== undefined ? { currencyCode: body.currencyCode } : {}),
      actorUserId: user.userId,
      actorRoles: user.roles,
      idempotencyKey: requireIdempotencyKey(idempotencyHeader),
    });
    return toResponse(payout);
  }

  @Get('vendors/:vendorId/payouts')
  @ApiOperation({ summary: 'List vendor payouts (newest first)' })
  async list(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const rows = await this.payouts.listPayouts({
      vendorId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      limit: clampLimit(limit),
      offset: clampOffset(offset),
    });
    return rows.map(toResponse);
  }

  @Get('payouts/:payoutId')
  @ApiOperation({ summary: 'Get a payout by id' })
  async get(@CurrentUser() user: RequestPrincipal, @Param('payoutId') payoutId: string) {
    return toResponse(
      await this.payouts.getPayout({
        payoutId,
        actorUserId: user.userId,
        actorRoles: user.roles,
      }),
    );
  }

  @Post('payouts/:payoutId/approve')
  @ApiOperation({ summary: 'Platform approve a payout under review' })
  async approve(@CurrentUser() user: RequestPrincipal, @Param('payoutId') payoutId: string) {
    return toResponse(
      await this.payouts.approvePayout({
        payoutId,
        actorUserId: user.userId,
        actorRoles: user.roles,
      }),
    );
  }

  @Post('payouts/:payoutId/reject')
  @ApiOperation({ summary: 'Platform reject a payout under review (releases reservation)' })
  async reject(
    @CurrentUser() user: RequestPrincipal,
    @Param('payoutId') payoutId: string,
    @Body() body: RejectPayoutDto,
  ) {
    return toResponse(
      await this.payouts.rejectPayout({
        payoutId,
        actorUserId: user.userId,
        actorRoles: user.roles,
        reason: body.reason,
      }),
    );
  }

  @Post('payouts/:payoutId/process')
  @ApiOperation({
    summary: 'Disburse an approved payout (stub provider); COMPLETED posts DEBIT PAYOUT',
  })
  async process(@CurrentUser() user: RequestPrincipal, @Param('payoutId') payoutId: string) {
    return toResponse(
      await this.payouts.processPayout({
        payoutId,
        actorUserId: user.userId,
        actorRoles: user.roles,
      }),
    );
  }
}
