import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  getTenantContext,
  isPlatformScopeActive,
} from '../../../../shared-kernel/infrastructure/context/tenant-context.storage';
import { TenantScopeInterceptor } from './tenant-scope.interceptor';

@ApiTags('tenancy')
@Controller('tenancy')
@UseInterceptors(TenantScopeInterceptor)
export class TenancyController {
  @Get('context')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect resolved tenant/vendor/store scope for the current request' })
  context() {
    const context = getTenantContext();
    return {
      requestId: context.requestId,
      userId: context.userId ?? context.principal?.userId ?? null,
      tenantId: context.tenantId ?? null,
      vendorId: context.vendorId ?? null,
      storeId: context.storeId ?? null,
      platformScope: isPlatformScopeActive(),
      roles: context.principal?.roles ?? [],
    };
  }
}
