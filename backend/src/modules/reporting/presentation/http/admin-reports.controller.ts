import { Controller, Get, Param, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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

  @Get('sales/trends')
  @ApiOperation({ summary: 'Platform admin: sales, revenue, and AOV time-series trends' })
  @ApiQuery({ name: 'days', required: false, description: 'Time horizon in days (default 30)' })
  async salesTrends(@CurrentUser() user: RequestPrincipal, @Query('days') days?: string) {
    const numDays = days ? Math.max(1, Math.min(365, parseInt(days, 10) || 30)) : 30;
    return this.queries.salesAnalytics(user.roles, numDays);
  }

  @Get('vendors/summary')
  @ApiOperation({ summary: 'Platform admin: vendor performance from reporting read model' })
  async vendorSummary(@CurrentUser() user: RequestPrincipal) {
    return this.queries.vendorPerformance(user.roles);
  }

  @Get('vendors/:vendorId/overview')
  @ApiOperation({ summary: 'Platform admin: vendor sales, orders, and revenue rollup' })
  @ApiQuery({ name: 'days', required: false })
  async vendorOverview(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Query('days') days?: string,
  ) {
    const numDays = days ? Math.max(1, Math.min(365, parseInt(days, 10) || 30)) : 30;
    return this.queries.vendorAnalytics(vendorId, user.userId, user.roles, numDays);
  }

  @Get('stores/summary')
  @ApiOperation({ summary: 'Platform admin: store performance from reporting read model' })
  async storeSummary(@CurrentUser() user: RequestPrincipal) {
    return this.queries.storePerformance(user.roles);
  }

  @Get('stores/:storeId/overview')
  @ApiOperation({ summary: 'Platform admin: store sales, orders, and revenue rollup' })
  @ApiQuery({ name: 'days', required: false })
  async storeOverview(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Query('days') days?: string,
  ) {
    const numDays = days ? Math.max(1, Math.min(365, parseInt(days, 10) || 30)) : 30;
    return this.queries.storeAnalytics(storeId, user.userId, user.roles, numDays);
  }

  @Get('products/top')
  @ApiOperation({ summary: 'Platform admin: top products by sales volume & revenue' })
  @ApiQuery({ name: 'days', required: false, description: 'Time horizon in days (default 30)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items (default 10)' })
  async topProducts(
    @CurrentUser() user: RequestPrincipal,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const numDays = days ? Math.max(1, Math.min(365, parseInt(days, 10) || 30)) : 30;
    const numLimit = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.queries.topProducts(user.roles, numDays, numLimit);
  }

  @Get('refunds/summary')
  @ApiOperation({ summary: 'Platform admin: refund analytics & return rate summary' })
  @ApiQuery({ name: 'days', required: false, description: 'Time horizon in days (default 30)' })
  async refundSummary(@CurrentUser() user: RequestPrincipal, @Query('days') days?: string) {
    const numDays = days ? Math.max(1, Math.min(365, parseInt(days, 10) || 30)) : 30;
    return this.queries.refundAnalytics(user.roles, numDays);
  }
}
