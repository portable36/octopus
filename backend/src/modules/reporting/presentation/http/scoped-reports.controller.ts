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
}
