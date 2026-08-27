import { Controller, Get, Param, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { GetStoreHandler } from '../../application/queries/get-store.handler';
import type { Store } from '../../domain/aggregates/store.aggregate';
import { StoreExceptionFilter } from './filters/store-exception.filter';

@ApiTags('admin-stores')
@Controller('admin/stores')
@ApiBearerAuth()
@RequirePermissions('platform.stores.read')
@UseFilters(StoreExceptionFilter)
export class AdminStoreController {
  constructor(private readonly getStore: GetStoreHandler) {}

  @Get()
  @ApiOperation({ summary: 'Platform admin: list all stores (read)' })
  async list(@CurrentUser() user: RequestPrincipal) {
    const stores = await this.getStore.listAllForPlatform(user.roles);
    return stores.map((store) => this.toResponse(store));
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
      status: store.status,
      profile: store.profile,
      address: store.address,
      settings: store.settings,
      staff: store.staff.map((member) => ({
        userId: member.userId,
        role: member.role,
        addedAt: member.addedAt.toISOString(),
      })),
    };
  }
}
