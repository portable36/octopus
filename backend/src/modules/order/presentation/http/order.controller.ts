import { Body, Controller, Get, HttpCode, Param, Post, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { OrderLifecycleHandler } from '../../application/commands/order.handlers';
import type { Order } from '../../domain/aggregates/order.aggregate';
import { FulfillOrderLineDto } from './dto/order.dto';
import { OrderExceptionFilter } from './filters/order-exception.filter';

@ApiTags('orders')
@Controller('orders')
@ApiBearerAuth()
@UseFilters(OrderExceptionFilter)
export class OrderController {
  constructor(private readonly lifecycle: OrderLifecycleHandler) {}

  @Get('mine')
  @ApiOperation({ summary: 'List orders for the authenticated customer' })
  async listMine(@CurrentUser() user: RequestPrincipal) {
    const list = await this.lifecycle.listMine({
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return list.map((order) => this.orderResponse(order));
  }

  @Get('stores/:storeId')
  @ApiOperation({ summary: 'List orders for a store (vendor/store staff)' })
  async listByStore(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    const list = await this.lifecycle.listByStore({
      storeId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return list.map((order) => this.orderResponse(order));
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get an order by id' })
  async get(@CurrentUser() user: RequestPrincipal, @Param('orderId') orderId: string) {
    const order = await this.lifecycle.get({
      orderId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.orderResponse(order);
  }

  @Post(':orderId/mark-paid')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark order paid (Payment module / trusted staff until Phase 11)' })
  async markPaid(@CurrentUser() user: RequestPrincipal, @Param('orderId') orderId: string) {
    const order = await this.lifecycle.markPaid({
      orderId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.orderResponse(order);
  }

  @Post(':orderId/mark-payment-failed')
  @HttpCode(200)
  async markPaymentFailed(
    @CurrentUser() user: RequestPrincipal,
    @Param('orderId') orderId: string,
  ) {
    const order = await this.lifecycle.markPaymentFailed({
      orderId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.orderResponse(order);
  }

  @Post(':orderId/start-processing')
  @HttpCode(200)
  async startProcessing(@CurrentUser() user: RequestPrincipal, @Param('orderId') orderId: string) {
    const order = await this.lifecycle.startProcessing({
      orderId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.orderResponse(order);
  }

  @Post(':orderId/lines/:lineId/fulfill')
  @HttpCode(200)
  async fulfillLine(
    @CurrentUser() user: RequestPrincipal,
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
    @Body() body: FulfillOrderLineDto,
  ) {
    const order = await this.lifecycle.fulfillLine({
      orderId,
      lineId,
      quantity: body.quantity,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.orderResponse(order);
  }

  @Post(':orderId/complete')
  @HttpCode(200)
  async complete(@CurrentUser() user: RequestPrincipal, @Param('orderId') orderId: string) {
    const order = await this.lifecycle.complete({
      orderId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.orderResponse(order);
  }

  @Post(':orderId/cancel')
  @HttpCode(200)
  async cancel(@CurrentUser() user: RequestPrincipal, @Param('orderId') orderId: string) {
    const order = await this.lifecycle.cancel({
      orderId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.orderResponse(order);
  }

  @Post(':orderId/request-refund')
  @HttpCode(200)
  async requestRefund(@CurrentUser() user: RequestPrincipal, @Param('orderId') orderId: string) {
    const order = await this.lifecycle.requestRefund({
      orderId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.orderResponse(order);
  }

  @Post(':orderId/request-return')
  @HttpCode(200)
  async requestReturn(@CurrentUser() user: RequestPrincipal, @Param('orderId') orderId: string) {
    const order = await this.lifecycle.requestReturn({
      orderId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.orderResponse(order);
  }

  @Post(':orderId/mark-returned')
  @HttpCode(200)
  async markReturned(@CurrentUser() user: RequestPrincipal, @Param('orderId') orderId: string) {
    const order = await this.lifecycle.markReturned({
      orderId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.orderResponse(order);
  }

  private orderResponse(order: Order) {
    return {
      id: order.id.value,
      orderNumber: order.orderNumber,
      checkoutId: order.checkoutId,
      customerId: order.customerId,
      vendorId: order.vendorId,
      storeId: order.storeId,
      currencyCode: order.currencyCode,
      subtotalMinor: order.subtotalMinor,
      discountMinor: order.discountMinor,
      shippingMinor: order.shippingMinor,
      taxMinor: order.taxMinor,
      commissionMinor: order.commissionMinor,
      totalMinor: order.totalMinor,
      shippingMethod: order.shippingMethod,
      shippingAddress: order.shippingAddress,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      lines: order.lineSnapshots(),
      version: order.version,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
