import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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
  constructor(private readonly listIntents: ListPaymentIntentsHandler) {}

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
