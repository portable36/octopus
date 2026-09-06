import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  UseFilters,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import {
  ProcessCourierWebhookHandler,
  type ProcessCourierWebhookResult,
} from '../../application/commands/fulfillment-webhook.handlers';
import { FulfillmentExceptionFilter } from './filters/fulfillment-exception.filter';

@ApiTags('fulfillment-webhooks')
@Controller('fulfillment/webhooks')
@UseFilters(FulfillmentExceptionFilter)
export class FulfillmentWebhookController {
  constructor(
    @Inject(ProcessCourierWebhookHandler)
    private readonly webhookHandler: ProcessCourierWebhookHandler,
  ) {}

  @Public()
  @Post('steadfast')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Steadfast courier webhook/status callback' })
  public async handleSteadfast(
    @Body() body: Record<string, unknown>,
    @Headers('x-webhook-token') tokenHeader?: string,
    @Headers('authorization') authHeader?: string,
    @Query('token') tokenQuery?: string,
    @Req() req?: Request,
  ): Promise<ProcessCourierWebhookResult> {
    const signatureOrToken = (
      tokenHeader ||
      authHeader?.replace(/^Bearer\s+/i, '') ||
      tokenQuery ||
      ''
    ).trim();

    return this.webhookHandler.execute({
      provider: 'STEADFAST',
      payload: body,
      ...(signatureOrToken ? { signatureOrToken } : {}),
      ...(req && typeof req.body === 'string' ? { rawBodyString: req.body } : {}),
    });
  }

  @Public()
  @Post('pathao')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Pathao courier webhook/status callback' })
  public async handlePathao(
    @Body() body: Record<string, unknown>,
    @Headers('x-pathao-signature') signatureHeader?: string,
    @Headers('x-auth-token') tokenHeader?: string,
    @Headers('authorization') authHeader?: string,
    @Query('token') tokenQuery?: string,
    @Req() req?: Request,
  ): Promise<ProcessCourierWebhookResult> {
    const signatureOrToken = (
      signatureHeader ||
      tokenHeader ||
      authHeader?.replace(/^Bearer\s+/i, '') ||
      tokenQuery ||
      ''
    ).trim();

    return this.webhookHandler.execute({
      provider: 'PATHAO',
      payload: body,
      ...(signatureOrToken ? { signatureOrToken } : {}),
      ...(req && typeof req.body === 'string' ? { rawBodyString: req.body } : {}),
    });
  }
}
