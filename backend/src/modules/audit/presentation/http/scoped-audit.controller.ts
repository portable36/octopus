import { Controller, Get, Param, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { clampLimit } from '../../../../shared-kernel/presentation/http/pagination';
import { AuditHandlers } from '../../application/commands/audit.handlers';
import type { AuditEventRecord } from '../../domain/audit.types';
import { AuditExceptionFilter } from './filters/audit-exception.filter';

function toDto(event: AuditEventRecord) {
  return {
    id: event.id,
    actorUserId: event.actorUserId,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    vendorId: event.vendorId,
    storeId: event.storeId,
    requestId: event.requestId,
    before: event.before,
    after: event.after,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
  };
}

@ApiTags('scoped-audit')
@Controller('audit')
@ApiBearerAuth()
@UseFilters(AuditExceptionFilter)
export class ScopedAuditController {
  constructor(private readonly audit: AuditHandlers) {}

  @Get('stores/:storeId')
  @ApiOperation({
    summary: 'Store-scoped activity logs (store manager, vendor owner, or platform admin)',
  })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'actionPrefix', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'actorUserId', required: false })
  async getStoreActivity(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('actionPrefix') actionPrefix?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    const l = clampLimit(limit);
    const o = offset ? Math.max(Number.parseInt(offset, 10) || 0, 0) : 0;
    const result = await this.audit.queryStoreActivity(storeId, user.userId, user.roles, {
      limit: l,
      offset: o,
      actionPrefix,
      action,
      resourceType,
      actorUserId,
    });
    return {
      items: result.items.map(toDto),
      total: result.total,
      limit: l,
      offset: o,
    };
  }

  @Get('vendors/:vendorId')
  @ApiOperation({
    summary: 'Vendor-scoped activity logs (vendor owner, staff, or platform admin)',
  })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'actionPrefix', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'actorUserId', required: false })
  async getVendorActivity(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('actionPrefix') actionPrefix?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    const l = clampLimit(limit);
    const o = offset ? Math.max(Number.parseInt(offset, 10) || 0, 0) : 0;
    const result = await this.audit.queryVendorActivity(vendorId, user.userId, user.roles, {
      limit: l,
      offset: o,
      actionPrefix,
      action,
      resourceType,
      actorUserId,
    });
    return {
      items: result.items.map(toDto),
      total: result.total,
      limit: l,
      offset: o,
    };
  }
}
