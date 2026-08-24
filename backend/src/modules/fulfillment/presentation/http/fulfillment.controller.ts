import { Body, Controller, Headers, HttpCode, Param, Post, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import {
  CreateShipmentHandler,
  MarkShipmentDeliveredManualHandler,
  SyncShipmentStatusHandler,
} from '../../application/commands/fulfillment.handlers';
import { CreateShipmentDto, MarkDeliveredManualDto } from './dto/fulfillment.dto';
import { FulfillmentExceptionFilter } from './filters/fulfillment-exception.filter';

@ApiTags('fulfillment')
@Controller('fulfillment')
@ApiBearerAuth()
@UseFilters(FulfillmentExceptionFilter)
export class FulfillmentController {
  constructor(
    private readonly createShipment: CreateShipmentHandler,
    private readonly syncStatus: SyncShipmentStatusHandler,
    private readonly markDelivered: MarkShipmentDeliveredManualHandler,
  ) {}

  @Post('shipments')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a shipment and hand off to Steadfast, Pathao, or MANUAL' })
  @ApiHeader({ name: 'idempotency-key', required: false })
  async create(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateShipmentDto,
    @Headers('idempotency-key') idempotencyHeader?: string,
  ) {
    const idempotencyKey = (body.idempotencyKey || idempotencyHeader || '').trim();
    return this.createShipment.execute({
      orderId: body.orderId,
      provider: body.provider,
      lines: body.lines,
      recipientName: body.recipientName,
      recipientPhone: body.recipientPhone,
      idempotencyKey,
      actorUserId: user.userId,
      actorRoles: user.roles,
      ...(body.recipientSecondaryPhone !== undefined
        ? { recipientSecondaryPhone: body.recipientSecondaryPhone }
        : {}),
      ...(body.recipientAddress !== undefined ? { recipientAddress: body.recipientAddress } : {}),
      ...(body.weightKg !== undefined ? { weightKg: body.weightKg } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(body.deliveryType !== undefined ? { deliveryType: body.deliveryType } : {}),
    });
  }

  @Post('shipments/:shipmentId/sync-status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Pull courier status; collect COD when delivered' })
  @ApiHeader({ name: 'idempotency-key', required: false })
  async sync(
    @CurrentUser() user: RequestPrincipal,
    @Param('shipmentId') shipmentId: string,
    @Headers('idempotency-key') idempotencyHeader?: string,
  ) {
    return this.syncStatus.execute({
      shipmentId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      idempotencyKey: (idempotencyHeader ?? `sync:${shipmentId}:${user.userId}`).trim(),
    });
  }

  @Post('shipments/:shipmentId/mark-delivered')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark MANUAL shipment delivered and collect COD if applicable' })
  async markDeliveredManual(
    @CurrentUser() user: RequestPrincipal,
    @Param('shipmentId') shipmentId: string,
    @Body() body: MarkDeliveredManualDto,
  ) {
    return this.markDelivered.execute({
      shipmentId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      idempotencyKey: body.idempotencyKey,
      ...(body.trackingCode !== undefined ? { trackingCode: body.trackingCode } : {}),
    });
  }
}
