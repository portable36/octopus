import { Controller, Get, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { ReportingQueryHandler } from '../../application/queries/reporting-query.handler';
import { ReportingExceptionFilter } from './filters/reporting-exception.filter';

@ApiTags('admin-reports')
@Controller('admin/reports')
@ApiBearerAuth()
@RequirePermissions('platform.reports.read')
@UseFilters(ReportingExceptionFilter)
export class AdminReportsController {
  constructor(private readonly queries: ReportingQueryHandler) {}

  @Get('orders/summary')
  @ApiOperation({ summary: 'Platform admin: order revenue summary from reporting read model' })
  async orderSummary(@CurrentUser() user: RequestPrincipal) {
    return this.queries.orderSummary(user.roles);
  }

  @Get('vendors/summary')
  @ApiOperation({ summary: 'Platform admin: vendor performance from reporting read model' })
  async vendorSummary(@CurrentUser() user: RequestPrincipal) {
    return this.queries.vendorPerformance(user.roles);
  }

  @Get('stores/summary')
  @ApiOperation({ summary: 'Platform admin: store performance from reporting read model' })
  async storeSummary(@CurrentUser() user: RequestPrincipal) {
    return this.queries.storePerformance(user.roles);
  }
}
