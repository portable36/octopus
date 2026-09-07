import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import type { ReturnRequest } from '../../domain/aggregates/return-request.aggregate';
import { RETURN_REASONS } from '../../domain/returns.types';
import { ReturnsHandlers } from '../../application/commands/returns.handlers';
import {
  InspectReturnDto,
  LookupOrderReturnDto,
  PublicCancelReturnDto,
  PublicRequestReturnDto,
  RejectReturnDto,
  RequestReturnDto,
} from './dto/returns.dto';
import { ReturnsExceptionFilter } from './filters/returns-exception.filter';

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

function toResponse(ret: ReturnRequest) {
  return {
    id: ret.id.value,
    orderId: ret.orderId,
    customerId: ret.customerId,
    vendorId: ret.vendorId,
    storeId: ret.storeId,
    status: ret.status,
    customerNote: ret.customerNote,
    rejectionReasonCode: ret.rejectionReasonCode,
    rejectionNote: ret.rejectionNote,
    items: ret.items,
    inspection: ret.inspection
      ? {
          ...ret.inspection,
          inspectedAt: ret.inspection.inspectedAt.toISOString(),
        }
      : null,
    requestedAt: ret.requestedAt.toISOString(),
    reviewedAt: ret.reviewedAt?.toISOString() ?? null,
    approvedAt: ret.approvedAt?.toISOString() ?? null,
    receivedAt: ret.receivedAt?.toISOString() ?? null,
    inspectedAt: ret.inspectedAt?.toISOString() ?? null,
    completedAt: ret.completedAt?.toISOString() ?? null,
    createdAt: ret.createdAt.toISOString(),
    updatedAt: ret.updatedAt.toISOString(),
  };
}

@ApiTags('returns')
@Controller()
@ApiBearerAuth()
@UseFilters(ReturnsExceptionFilter)
export class ReturnsController {
  constructor(private readonly handlers: ReturnsHandlers) {}

  @Public()
  @Get('returns/reasons')
  @ApiOperation({ summary: 'List active customer-selectable return reasons' })
  listReasons() {
    return RETURN_REASONS.filter((r) => r.active && r.customerSelectable);
  }

  @Public()
  @Post('returns/public/lookup')
  @HttpCode(200)
  @ApiOperation({ summary: 'Lookup order details and return eligibility by order number & email' })
  async publicLookup(@Body() body: LookupOrderReturnDto) {
    return this.handlers.publicLookup(body);
  }

  @Public()
  @Post('returns/public/request')
  @HttpCode(201)
  @ApiOperation({ summary: 'Submit self-service customer return request' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  async publicRequest(
    @Body() body: PublicRequestReturnDto,
    @Headers('idempotency-key') idempotencyHeader?: string,
  ) {
    const ret = await this.handlers.publicRequestReturn({
      orderNumber: body.orderNumber,
      email: body.email,
      idempotencyKey: requireIdempotencyKey(idempotencyHeader),
      ...(body.note !== undefined ? { note: body.note } : {}),
      items: body.items,
    });
    return this.handlers.buildReturnTimeline(ret, body.orderNumber);
  }

  @Public()
  @Get('returns/public/:returnId')
  @ApiOperation({ summary: 'Get customer return tracking timeline' })
  async publicGetTimeline(
    @Param('returnId') returnId: string,
    @Query('orderNumber') orderNumber?: string,
    @Query('email') email?: string,
  ) {
    return this.handlers.publicGetReturnTimeline({ returnId, orderNumber, email });
  }

  @Public()
  @Post('returns/public/:returnId/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel customer self-service return request' })
  async publicCancel(@Param('returnId') returnId: string, @Body() body: PublicCancelReturnDto) {
    return this.handlers.publicCancelReturn({
      returnId,
      orderNumber: body.orderNumber,
      email: body.email,
    });
  }

  @Post('orders/:orderId/returns')
  @HttpCode(201)
  @ApiOperation({ summary: 'Request a return for an order' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  async request(
    @CurrentUser() user: RequestPrincipal,
    @Param('orderId') orderId: string,
    @Body() body: RequestReturnDto,
    @Headers('idempotency-key') idempotencyHeader?: string,
  ) {
    const ret = await this.handlers.requestReturn({
      orderId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      idempotencyKey: requireIdempotencyKey(idempotencyHeader),
      ...(body.note !== undefined ? { note: body.note } : {}),
      items: body.items,
    });
    return toResponse(ret);
  }

  @Get('orders/:orderId/returns')
  @ApiOperation({ summary: 'List returns for an order' })
  async listByOrder(@CurrentUser() user: RequestPrincipal, @Param('orderId') orderId: string) {
    const list = await this.handlers.listByOrder({
      orderId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return list.map(toResponse);
  }

  @Get('returns/:returnId')
  @ApiOperation({ summary: 'Get a return by id' })
  async get(@CurrentUser() user: RequestPrincipal, @Param('returnId') returnId: string) {
    const ret = await this.handlers.getReturn({
      returnId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return toResponse(ret);
  }

  @Post('returns/:returnId/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a return request (customer, early states only)' })
  async cancel(@CurrentUser() user: RequestPrincipal, @Param('returnId') returnId: string) {
    const ret = await this.handlers.cancel({
      returnId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return toResponse(ret);
  }

  @Post('admin/returns/:returnId/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve a return request' })
  async approve(@CurrentUser() user: RequestPrincipal, @Param('returnId') returnId: string) {
    const ret = await this.handlers.approve({
      returnId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return toResponse(ret);
  }

  @Post('admin/returns/:returnId/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject a return request' })
  async reject(
    @CurrentUser() user: RequestPrincipal,
    @Param('returnId') returnId: string,
    @Body() body: RejectReturnDto,
  ) {
    const ret = await this.handlers.reject({
      returnId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      reasonCode: body.reasonCode,
      ...(body.note !== undefined ? { note: body.note } : {}),
    });
    return toResponse(ret);
  }

  @Post('admin/returns/:returnId/receive')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark returned goods as received and start inspection' })
  async receive(@CurrentUser() user: RequestPrincipal, @Param('returnId') returnId: string) {
    const ret = await this.handlers.receive({
      returnId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return toResponse(ret);
  }

  @Post('admin/returns/:returnId/inspect')
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete return inspection' })
  async inspect(
    @CurrentUser() user: RequestPrincipal,
    @Param('returnId') returnId: string,
    @Body() body: InspectReturnDto,
  ) {
    const ret = await this.handlers.inspect({
      returnId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      quantityReceived: body.quantityReceived,
      quantityAccepted: body.quantityAccepted,
      quantityRejected: body.quantityRejected,
      condition: body.condition,
      ...(body.reason !== undefined ? { reason: body.reason } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
    });
    return toResponse(ret);
  }
}
