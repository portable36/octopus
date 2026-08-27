import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { clampLimit } from '../../../../shared-kernel/presentation/http/pagination';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { AuditHandlers } from '../../application/commands/audit.handlers';
import { AuditExceptionFilter } from './filters/audit-exception.filter';

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
  @ApiQuery({ name: 'actionPrefix', required: false })
  async list(
    @CurrentUser() user: RequestPrincipal,
    @Query('limit') limit?: string,
    @Query('actionPrefix') actionPrefix?: string,
  ) {
    const events = await this.audit.listRecent(user.roles, clampLimit(limit), actionPrefix);
    return events.map((event) => ({
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
    }));
  }
}
