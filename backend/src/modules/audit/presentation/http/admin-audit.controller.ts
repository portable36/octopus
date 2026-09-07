import { Controller, Get, Param, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { clampLimit } from '../../../../shared-kernel/presentation/http/pagination';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
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

@ApiTags('admin-audit')
@Controller('admin/audit')
@ApiBearerAuth()
@RequirePermissions('audit.read')
@UseFilters(AuditExceptionFilter)
export class AdminAuditController {
  constructor(private readonly audit: AuditHandlers) {}

  @Get('events')
  @ApiOperation({ summary: 'List recent append-only audit events (platform admin)' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'actionPrefix', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'resourceId', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'actorUserId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async list(
    @CurrentUser() user: RequestPrincipal,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('actionPrefix') actionPrefix?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('storeId') storeId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    if (
      offset ||
      action ||
      resourceType ||
      resourceId ||
      vendorId ||
      storeId ||
      actorUserId ||
      fromDate ||
      toDate
    ) {
      const l = clampLimit(limit);
      const o = offset ? Math.max(Number.parseInt(offset, 10) || 0, 0) : 0;
      const res = await this.audit.queryAdmin(user.roles, {
        limit: l,
        offset: o,
        actionPrefix,
        action,
        resourceType,
        resourceId,
        vendorId,
        storeId,
        actorUserId,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
      });
      return res.items.map(toDto);
    }
    const events = await this.audit.listRecent(user.roles, clampLimit(limit), actionPrefix);
    return events.map(toDto);
  }

  @Get('query')
  @ApiOperation({ summary: 'Paginated search with total count of audit events (platform admin)' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'actionPrefix', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'resourceId', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'storeId', required: false })
  @ApiQuery({ name: 'actorUserId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async query(
    @CurrentUser() user: RequestPrincipal,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('actionPrefix') actionPrefix?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('storeId') storeId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const l = clampLimit(limit);
    const o = offset ? Math.max(Number.parseInt(offset, 10) || 0, 0) : 0;
    const res = await this.audit.queryAdmin(user.roles, {
      limit: l,
      offset: o,
      actionPrefix,
      action,
      resourceType,
      resourceId,
      vendorId,
      storeId,
      actorUserId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
    return {
      items: res.items.map(toDto),
      total: res.total,
      limit: l,
      offset: o,
    };
  }

  @Get('stores/:storeId')
  @ApiOperation({ summary: 'Store-scoped audit events (platform admin)' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async listStoreEvents(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = clampLimit(limit);
    const o = offset ? Math.max(Number.parseInt(offset, 10) || 0, 0) : 0;
    const res = await this.audit.queryAdmin(user.roles, {
      limit: l,
      offset: o,
      storeId,
    });
    return {
      items: res.items.map(toDto),
      total: res.total,
      limit: l,
      offset: o,
    };
  }

  @Get('vendors/:vendorId')
  @ApiOperation({ summary: 'Vendor-scoped audit events (platform admin)' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async listVendorEvents(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = clampLimit(limit);
    const o = offset ? Math.max(Number.parseInt(offset, 10) || 0, 0) : 0;
    const res = await this.audit.queryAdmin(user.roles, {
      limit: l,
      offset: o,
      vendorId,
    });
    return {
      items: res.items.map(toDto),
      total: res.total,
      limit: l,
      offset: o,
    };
  }
}
