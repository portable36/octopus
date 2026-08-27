import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { clampLimit } from '../../../../shared-kernel/presentation/http/pagination';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { OrderLifecycleHandler } from '../../application/commands/order.handlers';
import type { Order } from '../../domain/aggregates/order.aggregate';
import { OrderExceptionFilter } from './filters/order-exception.filter';

@ApiTags('admin-orders')
@Controller('admin/orders')
@ApiBearerAuth()
@RequirePermissions('platform.orders.read')
@UseFilters(OrderExceptionFilter)
export class AdminOrderController {
  constructor(private readonly lifecycle: OrderLifecycleHandler) {}

  @Get()
  @ApiOperation({ summary: 'Platform admin: recent orders (read)' })
  @ApiQuery({ name: 'limit', required: false })
  async list(@CurrentUser() user: RequestPrincipal, @Query('limit') limit?: string) {
    const list = await this.lifecycle.listRecentForPlatform({
      actorRoles: user.roles,
      limit: clampLimit(limit),
    });
    return list.map((order) => this.toResponse(order));
  }

  private toResponse(order: Order) {
    return {
      id: order.id.value,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      vendorId: order.vendorId,
      storeId: order.storeId,
      currencyCode: order.currencyCode,
      totalMinor: order.totalMinor,
      paymentMethod: order.paymentMethod,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
