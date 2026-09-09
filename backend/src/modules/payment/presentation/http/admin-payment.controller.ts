import { Controller, Get, Inject, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AppConfigService } from '../../../../config/app-config.service';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { clampLimit } from '../../../../shared-kernel/presentation/http/pagination';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { ListPaymentIntentsHandler } from '../../application/commands/payment.handlers';
import type { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import { PaymentExceptionFilter } from './filters/payment-exception.filter';

@ApiTags('admin-payments')
@Controller('admin/payments')
@ApiBearerAuth()
@RequirePermissions('platform.payments.read')
@UseFilters(PaymentExceptionFilter)
export class AdminPaymentController {
  constructor(
    private readonly listIntents: ListPaymentIntentsHandler,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Platform admin: recent payment intents (read; no secrets)' })
  @ApiQuery({ name: 'limit', required: false })
  async list(@CurrentUser() user: RequestPrincipal, @Query('limit') limit?: string) {
    const list = await this.listIntents.listRecentForPlatform({
      actorRoles: user.roles,
      limit: clampLimit(limit),
    });
    return list.map((intent) => this.toResponse(intent));
  }

  @Get('gateways')
  @ApiOperation({
    summary: 'Platform admin: payment gateway env readiness (booleans only; no secrets)',
  })
  gateways() {
    return {
      mode: this.config.paymentGatewayMode,
      sslcommerz: {
        configured: Boolean(this.config.sslCommerzStoreId && this.config.sslCommerzStorePasswd),
        sandbox: this.config.sslCommerzIsSandbox,
      },
      bkash: {
        configured: Boolean(
          this.config.bkashAppKey &&
            this.config.bkashAppSecret &&
            this.config.bkashUsername &&
            this.config.bkashPassword,
        ),
        sandbox: this.config.bkashIsSandbox,
      },
      nagad: {
        configured: Boolean(
          this.config.nagadMerchantId &&
            this.config.nagadMerchantPrivateKey &&
            this.config.nagadPgPublicKey,
        ),
        sandbox: this.config.nagadIsSandbox,
      },
    };
  }

  private toResponse(intent: PaymentIntent) {
    return {
      id: intent.id.value,
      orderId: intent.orderId,
      vendorId: intent.vendorId,
      storeId: intent.storeId,
      customerId: intent.customerId,
      paymentMethod: intent.paymentMethod,
      provider: intent.provider,
      status: intent.status,
      amountMinor: intent.amountMinor,
      currencyCode: intent.currencyCode,
      createdAt: intent.createdAt.toISOString(),
      updatedAt: intent.updatedAt.toISOString(),
    };
  }
}
