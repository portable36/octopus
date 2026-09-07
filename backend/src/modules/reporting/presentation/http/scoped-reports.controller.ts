import { Controller, Get, Param, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { ReportingQueryHandler } from '../../application/queries/reporting-query.handler';
import { ReportingExceptionFilter } from './filters/reporting-exception.filter';

@ApiTags('reports')
@Controller('reports')
@ApiBearerAuth()
@UseFilters(ReportingExceptionFilter)
export class ScopedReportsController {
  constructor(private readonly queries: ReportingQueryHandler) {}

  @Get('stores/:storeId/overview')
  @ApiOperation({ summary: 'Store manager/staff: store sales, orders, and revenue rollup' })
  @ApiQuery({ name: 'days', required: false, description: 'Time horizon in days (default 30)' })
  public async storeOverview(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Query('days') days?: string,
  ) {
    const numDays = days ? Math.max(1, Math.min(365, parseInt(days, 10) || 30)) : 30;
    return this.queries.storeAnalytics(storeId, user.userId, user.roles, numDays);
  }

  @Get('stores/:storeId/products/top')
  @ApiOperation({ summary: 'Store manager/staff: store top products by volume and revenue' })
  @ApiQuery({ name: 'days', required: false, description: 'Time horizon in days (default 30)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items (default 10)' })
  public async storeTopProducts(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const numDays = days ? Math.max(1, Math.min(365, parseInt(days, 10) || 30)) : 30;
    const numLimit = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.queries.storeTopProducts(storeId, user.userId, user.roles, numDays, numLimit);
  }

  @Get('stores/:storeId/refunds/summary')
  @ApiOperation({ summary: 'Store manager/staff: store refund and return rate analytics' })
  @ApiQuery({ name: 'days', required: false, description: 'Time horizon in days (default 30)' })
  public async storeRefundSummary(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Query('days') days?: string,
  ) {
    const numDays = days ? Math.max(1, Math.min(365, parseInt(days, 10) || 30)) : 30;
    return this.queries.storeRefundAnalytics(storeId, user.userId, user.roles, numDays);
  }

  @Get('vendors/:vendorId/overview')
  @ApiOperation({ summary: 'Vendor owner/staff: vendor sales, orders, and revenue rollup' })
  @ApiQuery({ name: 'days', required: false, description: 'Time horizon in days (default 30)' })
  public async vendorOverview(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Query('days') days?: string,
  ) {
    const numDays = days ? Math.max(1, Math.min(365, parseInt(days, 10) || 30)) : 30;
    return this.queries.vendorAnalytics(vendorId, user.userId, user.roles, numDays);
  }

  @Get('vendors/:vendorId/products/top')
  @ApiOperation({ summary: 'Vendor owner/staff: vendor top products by volume and revenue' })
  @ApiQuery({ name: 'days', required: false, description: 'Time horizon in days (default 30)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items (default 10)' })
  public async vendorTopProducts(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const numDays = days ? Math.max(1, Math.min(365, parseInt(days, 10) || 30)) : 30;
    const numLimit = limit ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 10;
    return this.queries.vendorTopProducts(vendorId, user.userId, user.roles, numDays, numLimit);
  }

  @Get('vendors/:vendorId/refunds/summary')
  @ApiOperation({ summary: 'Vendor owner/staff: vendor refund and return rate analytics' })
  @ApiQuery({ name: 'days', required: false, description: 'Time horizon in days (default 30)' })
  public async vendorRefundSummary(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Query('days') days?: string,
  ) {
    const numDays = days ? Math.max(1, Math.min(365, parseInt(days, 10) || 30)) : 30;
    return this.queries.vendorRefundAnalytics(vendorId, user.userId, user.roles, numDays);
  }
}
