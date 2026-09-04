import { Body, Controller, Get, HttpCode, Param, Post, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { clampLimit } from '../../../../shared-kernel/presentation/http/pagination';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { RetryProvisioningHandler } from '../../application/commands/retry-provisioning.handler';
import { StoreLifecycleHandler } from '../../application/commands/store-lifecycle.handler';
import type { AdminStoreListSort } from '../../application/queries/admin-store-list.types';
import { GetStoreOverviewHandler } from '../../application/queries/get-store-overview.handler';
import { GetProvisioningStatusHandler } from '../../application/queries/get-provisioning-status.handler';
import { GetStoreHandler } from '../../application/queries/get-store.handler';
import { ListAdminStoresHandler } from '../../application/queries/list-admin-stores.handler';
import type { Store } from '../../domain/aggregates/store.aggregate';
import type { StoreStatus } from '../../domain/store.types';
import {
  ADMIN_STORE_STATUSES,
  AdminListStoresQueryDto,
  MaintenanceStoreRequestDto,
  SuspendStoreRequestDto,
} from './dto/store.dto';
import { StoreExceptionFilter } from './filters/store-exception.filter';

function parseStatuses(raw: string | undefined): StoreStatus[] | undefined {
  if (!raw || raw.trim() === '') {
    return undefined;
  }
  const allowed = new Set<string>(ADMIN_STORE_STATUSES);
  const statuses = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => allowed.has(part)) as StoreStatus[];
  return statuses.length > 0 ? statuses : undefined;
}

@ApiTags('admin-stores')
@Controller('admin/stores')
@ApiBearerAuth()
@RequirePermissions('platform.stores.read')
@UseFilters(StoreExceptionFilter)
export class AdminStoreController {
  constructor(
    private readonly getStore: GetStoreHandler,
    private readonly listAdminStores: ListAdminStoresHandler,
    private readonly overview: GetStoreOverviewHandler,
    private readonly lifecycle: StoreLifecycleHandler,
    private readonly getProvisioningStatus: GetProvisioningStatusHandler,
    private readonly retryProvisioning: RetryProvisioningHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Platform admin: search/filter/paginated store list' })
  async list(@CurrentUser() user: RequestPrincipal, @Query() query: AdminListStoresQueryDto) {
    const page = query.page && query.page > 0 ? Math.trunc(query.page) : 1;
    const limit = clampLimit(query.limit);
    const sort = (query.sort ?? 'createdAt_desc') as AdminStoreListSort;
    const statuses = parseStatuses(query.status);
    const result = await this.listAdminStores.list(user.roles, {
      ...(query.q !== undefined ? { q: query.q } : {}),
      ...(statuses !== undefined ? { statuses } : {}),
      ...(query.vendorId !== undefined ? { vendorId: query.vendorId } : {}),
      ...(query.storeType !== undefined ? { storeType: query.storeType } : {}),
      ...(query.country !== undefined ? { country: query.country } : {}),
      page,
      limit,
      sort,
    });
    return {
      items: result.items.map((row) => ({
        id: row.id,
        vendorId: row.vendorId,
        vendorDisplayName: row.vendorDisplayName,
        storeCode: row.storeCode,
        storeType: row.storeType,
        status: row.status,
        profile: {
          displayName: row.displayName,
          slug: row.slug,
          description: null,
        },
        location: {
          city: row.city,
          region: row.region,
          countryCode: row.countryCode,
        },
        createdAt: row.createdAt.toISOString(),
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Platform admin: store counts by lifecycle status' })
  async stats(@CurrentUser() user: RequestPrincipal) {
    return this.listAdminStores.stats(user.roles);
  }

  @Get(':storeId/overview')
  @ApiOperation({ summary: 'Platform admin: store overview + health summary' })
  async getOverview(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    const result = await this.overview.execute(storeId, user.roles);
    return {
      store: this.toResponse(result.store),
      health: result.health,
      provisioning: result.provisioning
        ? {
            runId: result.provisioning.runId,
            status: result.provisioning.status,
            lastError: result.provisioning.lastError,
            startedAt: result.provisioning.startedAt.toISOString(),
            completedAt: result.provisioning.completedAt?.toISOString() ?? null,
          }
        : null,
      metrics: result.metrics,
    };
  }

  @Get(':storeId/health')
  @ApiOperation({ summary: 'Platform admin: store health checks only' })
  async getHealth(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    return this.overview.healthOnly(storeId, user.roles);
  }

  @Get(':storeId/provisioning')
  @ApiOperation({ summary: 'Platform admin: get store provisioning status' })
  async provisioningStatus(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
  ) {
    const status = await this.getProvisioningStatus.execute(storeId, user.userId, user.roles);
    return {
      run: {
        id: status.run.id,
        storeId: status.run.storeId,
        status: status.run.status,
        startedAt: status.run.startedAt.toISOString(),
        completedAt: status.run.completedAt?.toISOString() ?? null,
        lastError: status.run.lastError,
      },
      steps: status.steps.map((step) => ({
        stepName: step.stepName,
        status: step.status,
        startedAt: step.startedAt?.toISOString() ?? null,
        completedAt: step.completedAt?.toISOString() ?? null,
        error: step.error,
        retryCount: step.retryCount,
      })),
    };
  }

  @Post(':storeId/provisioning/retry')
  @HttpCode(200)
  @RequirePermissions('platform.stores.write')
  @ApiOperation({ summary: 'Platform admin: retry failed store provisioning' })
  async retryProvisioningRoute(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
  ) {
    await this.retryProvisioning.execute(storeId, user.userId, user.roles);
    return { ok: true };
  }

  @Post(':storeId/activate')
  @HttpCode(200)
  @RequirePermissions('platform.stores.write')
  @ApiOperation({ summary: 'Platform admin: activate store' })
  async activate(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    const store = await this.lifecycle.activate(storeId, user.userId, user.roles);
    return this.toResponse(store);
  }

  @Post(':storeId/suspend')
  @HttpCode(200)
  @RequirePermissions('platform.stores.write')
  @ApiOperation({ summary: 'Platform admin: suspend store' })
  async suspend(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: SuspendStoreRequestDto,
  ) {
    const store = await this.lifecycle.suspend(storeId, user.userId, user.roles, body.reason);
    return this.toResponse(store);
  }

  @Post(':storeId/maintenance')
  @HttpCode(200)
  @RequirePermissions('platform.stores.write')
  @ApiOperation({ summary: 'Platform admin: put store into maintenance' })
  async maintenance(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: MaintenanceStoreRequestDto,
  ) {
    const store = await this.lifecycle.enableMaintenance(
      storeId,
      user.userId,
      user.roles,
      body.reason,
    );
    return this.toResponse(store);
  }

  @Post(':storeId/archive')
  @HttpCode(200)
  @RequirePermissions('platform.stores.write')
  @ApiOperation({ summary: 'Platform admin: archive store' })
  async archive(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    const store = await this.lifecycle.archive(storeId, user.userId, user.roles);
    return this.toResponse(store);
  }

  @Get(':storeId')
  @ApiOperation({ summary: 'Platform admin: get store by id' })
  async getOne(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    const store = await this.getStore.byId(storeId, user.userId, user.roles);
    return this.toResponse(store);
  }

  private toResponse(store: Store) {
    return {
      id: store.id.value,
      vendorId: store.vendorId,
      storeCode: store.storeCode,
      storeType: store.storeType,
      status: store.status,
      profile: store.profile,
      address: store.address,
      contact: store.contact,
      settings: store.settings,
      staff: store.staff.map((member) => ({
        userId: member.userId,
        role: member.role,
        addedAt: member.addedAt.toISOString(),
      })),
    };
  }
}
