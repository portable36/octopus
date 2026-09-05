import {
  All,
  Body,
  Controller,
  HttpCode,
  Inject,
  Optional,
  Post,
  Query,
  Req,
  UseFilters,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  API_RATE_LIMITER,
  type ApiRateLimiter,
} from '../../../../shared-kernel/application/ports/api-rate-limiter.port';
import { ProcessGatewayCallbackHandler } from '../../application/commands/payment-gateway.handlers';
import { PaymentExceptionFilter } from './filters/payment-exception.filter';

@ApiTags('payments-gateways')
@Controller('payments/gateways')
@UseFilters(PaymentExceptionFilter)
export class PaymentGatewayController {
  constructor(
    @Inject(ProcessGatewayCallbackHandler)
    private readonly callbackHandler: ProcessGatewayCallbackHandler,
    @Optional()
    @Inject(API_RATE_LIMITER)
    private readonly rateLimiter?: ApiRateLimiter,
  ) {}

  @All('sslcommerz/callback')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle SSLCommerz return callback' })
  async handleSslCommerzCallback(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    if (this.rateLimiter) {
      await this.rateLimiter.consume(`payment:gw:sslcommerz:${req.ip ?? 'unknown'}`, 120, 60);
    }
    const payload = { ...(query || {}), ...(body || {}) };
    return this.callbackHandler.execute({
      provider: 'SSLCOMMERZ',
      payload,
      paymentIntentId: (query.paymentIntentId || payload.tran_id) as string | undefined,
    });
  }

  @Post('sslcommerz/ipn')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle SSLCommerz IPN webhook notification' })
  async handleSslCommerzIpn(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    if (this.rateLimiter) {
      await this.rateLimiter.consume(`payment:gw:sslcommerz:ipn:${req.ip ?? 'unknown'}`, 200, 60);
    }
    const payload = { ...(query || {}), ...(body || {}) };
    const res = await this.callbackHandler.execute({
      provider: 'SSLCOMMERZ',
      payload,
      paymentIntentId: (query.paymentIntentId || payload.tran_id) as string | undefined,
    });
    return { received: true, status: res.status };
  }

  @All('bkash/callback')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle bKash return callback or webhook' })
  async handleBkashCallback(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    if (this.rateLimiter) {
      await this.rateLimiter.consume(`payment:gw:bkash:${req.ip ?? 'unknown'}`, 120, 60);
    }
    let payload = { ...(query || {}), ...(body || {}) };

    // Support AWS SNS webhook subscription confirmation from bKash
    if (payload.Type === 'SubscriptionConfirmation' && typeof payload.SubscribeURL === 'string') {
      try {
        await fetch(payload.SubscribeURL as string);
        return { success: true, message: 'Subscription confirmed' };
      } catch {
        return { success: false, message: 'Failed to confirm subscription' };
      }
    }

    // Support AWS SNS webhook notification from bKash
    if (payload.Type === 'Notification' && typeof payload.Message === 'string') {
      try {
        const parsedMessage = JSON.parse(payload.Message as string) as Record<string, unknown>;
        payload = { ...payload, ...parsedMessage };
      } catch {
        // Proceed with raw payload if parsing fails
      }
    }

    return this.callbackHandler.execute({
      provider: 'BKASH',
      payload,
      paymentIntentId: (query.paymentIntentId ||
        payload.paymentIntentId ||
        payload.merchantInvoiceNumber) as string | undefined,
    });
  }

  @All('nagad/callback')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Nagad return callback or webhook' })
  async handleNagadCallback(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    if (this.rateLimiter) {
      await this.rateLimiter.consume(`payment:gw:nagad:${req.ip ?? 'unknown'}`, 120, 60);
    }
    const payload = { ...(query || {}), ...(body || {}) };
    return this.callbackHandler.execute({
      provider: 'NAGAD',
      payload,
      paymentIntentId: (query.paymentIntentId || payload.paymentIntentId) as string | undefined,
    });
  }
}
