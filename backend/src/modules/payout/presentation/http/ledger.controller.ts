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
import { LedgerCommandHandler } from '../../application/commands/ledger.handlers';
import { LedgerAuthorizationService } from '../../application/services/ledger-authorization.service';
import { CreateLedgerAdjustmentDto } from './dto/ledger-adjustment.dto';
import { LedgerExceptionFilter } from './filters/ledger-exception.filter';

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

function parseOptionalDate(value: string | undefined, label: string): Date | undefined {
  if (value == null || value.trim() === '') {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: `Invalid ${label} datetime.`,
      code: 'INVALID_DATETIME',
    });
  }
  return parsed;
}

@ApiTags('finance')
@Controller('finance')
@ApiBearerAuth()
@UseFilters(LedgerExceptionFilter)
export class LedgerController {
  constructor(
    private readonly ledger: LedgerCommandHandler,
    private readonly authz: LedgerAuthorizationService,
  ) {}

  @Get('vendors/:vendorId/balance')
  @ApiOperation({ summary: 'Get derived vendor ledger balance (pending + available)' })
  async balance(@CurrentUser() user: RequestPrincipal, @Param('vendorId') vendorId: string) {
    await this.authz.requireLedgerReader(vendorId, user.userId, user.roles);
    const balance = await this.ledger.getVendorBalance(vendorId);
    return (
      balance ?? {
        vendorId,
        currencyCode: 'BDT',
        pendingMinor: 0,
        availableMinor: 0,
        rebuiltAt: new Date().toISOString(),
      }
    );
  }

  @Get('vendors/:vendorId/summary')
  @ApiOperation({
    summary: 'Vendor finance dashboard summary (balance, reserved payouts, spendable, type totals)',
  })
  async summary(@CurrentUser() user: RequestPrincipal, @Param('vendorId') vendorId: string) {
    await this.authz.requireLedgerReader(vendorId, user.userId, user.roles);
    return this.ledger.getVendorFinanceSummary(vendorId);
  }

  @Get('vendors/:vendorId/ledger')
  @ApiOperation({ summary: 'List vendor ledger entries (newest first)' })
  async entries(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    await this.authz.requireLedgerReader(vendorId, user.userId, user.roles);
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safeOffset = Math.max(offset, 0);
    return this.ledger.listVendorEntries(vendorId, safeLimit, safeOffset);
  }

  @Get('vendors/:vendorId/statement')
  @ApiOperation({
    summary: 'Vendor ledger statement with server-side pagination and optional date range',
  })
  async statement(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('from') fromRaw?: string,
    @Query('to') toRaw?: string,
  ) {
    await this.authz.requireLedgerReader(vendorId, user.userId, user.roles);
    const from = parseOptionalDate(fromRaw, 'from');
    const to = parseOptionalDate(toRaw, 'to');
    return this.ledger.getVendorStatement({
      vendorId,
      limit: Math.min(Math.max(limit, 1), 200),
      offset: Math.max(offset, 0),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }

  @Get('vendors/:vendorId/reconciliation')
  @ApiOperation({
    summary: 'Platform reconciliation report (derived vs snapshot + orphan refs; no auto-fix)',
  })
  async reconciliation(@CurrentUser() user: RequestPrincipal, @Param('vendorId') vendorId: string) {
    this.authz.requirePlatformReconciler(user.roles);
    return this.ledger.reconcileVendor(vendorId);
  }

  @Post('vendors/:vendorId/adjustments')
  @HttpCode(201)
  @ApiOperation({ summary: 'Platform-only ledger adjustment (reason + audit metadata)' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  async adjust(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: CreateLedgerAdjustmentDto,
    @Headers('idempotency-key') idempotencyHeader?: string,
  ) {
    this.authz.requirePlatformAdjuster(user.roles);
    await this.authz.requireStoreOnVendor(vendorId, body.storeId);
    return this.ledger.recordAdjustment({
      vendorId,
      storeId: body.storeId,
      direction: body.direction,
      amountMinor: body.amountMinor,
      currencyCode: body.currencyCode,
      reason: body.reason,
      actorUserId: user.userId,
      idempotencyKey: requireIdempotencyKey(idempotencyHeader),
      ...(body.availableImmediately !== undefined
        ? { availableImmediately: body.availableImmediately }
        : {}),
    });
  }
}
