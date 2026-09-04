import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import {
  API_RATE_LIMITER,
  type ApiRateLimiter,
} from '../../../../shared-kernel/application/ports/api-rate-limiter.port';
import {
  CollectCodPaymentHandler,
  CreateRefundHandler,
} from '../../application/commands/payment.handlers';
import { CollectCodPaymentDto, CreateRefundDto } from './dto/payment.dto';
import { PaymentExceptionFilter } from './filters/payment-exception.filter';

@ApiTags('payments')
@Controller('payments')
@ApiBearerAuth()
@UseFilters(PaymentExceptionFilter)
export class PaymentController {
  constructor(
    private readonly collectCod: CollectCodPaymentHandler,
    private readonly createRefund: CreateRefundHandler,
    @Inject(API_RATE_LIMITER) private readonly rateLimiter: ApiRateLimiter,
  ) {}

  @Post('cod/:paymentIntentId/collect')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm cash-on-delivery collection for a payment intent' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Required idempotency key for COD collection',
  })
  async collect(
    @CurrentUser() user: RequestPrincipal,
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: CollectCodPaymentDto,
    @Headers('idempotency-key') idempotencyHeader: string | undefined,
    @Req() req: Request,
  ) {
    await this.rateLimiter.consume(`payment:cod-collect:${req.ip ?? 'unknown'}`, 30, 60);
    const idempotencyKey = requireIdempotencyKey(idempotencyHeader);
    return this.collectCod.execute({
      paymentIntentId,
      amountMinor: body.amountMinor,
      currencyCode: body.currency,
      idempotencyKey,
      actorUserId: user.userId,
      actorRoles: user.roles,
      ...(body.note !== undefined ? { note: body.note } : {}),
    });
  }

  @Post(':paymentIntentId/refunds')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a refund against a payment intent (COD collected / configured gateway)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Required idempotency key for refund creation',
  })
  async refund(
    @CurrentUser() user: RequestPrincipal,
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: CreateRefundDto,
    @Headers('idempotency-key') idempotencyHeader: string | undefined,
    @Req() req: Request,
  ) {
    await this.rateLimiter.consume(`payment:refund:${req.ip ?? 'unknown'}`, 20, 60);
    const idempotencyKey = requireIdempotencyKey(idempotencyHeader);
    return this.createRefund.execute({
      paymentIntentId,
      amountMinor: body.amountMinor,
      currencyCode: body.currency,
      idempotencyKey,
      actorUserId: user.userId,
      actorRoles: user.roles,
      ...(body.returnId !== undefined ? { returnId: body.returnId } : {}),
      ...(body.reason !== undefined ? { reason: body.reason } : {}),
    });
  }
}

function requireIdempotencyKey(header?: string): string {
  const idempotencyKey = header?.trim();
  if (!idempotencyKey || idempotencyKey.length < 8) {
    throw new BadRequestException({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'Idempotency-Key header is required (min 8 characters).',
      code: 'IDEMPOTENCY_KEY_REQUIRED',
    });
  }
  return idempotencyKey;
}
