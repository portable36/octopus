import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { CreateStoreHandler } from '../../application/commands/create-store.handler';
import { StoreLifecycleHandler } from '../../application/commands/store-lifecycle.handler';
import { UpdateStoreHandler } from '../../application/commands/update-store.handler';
import { GetStoreHandler } from '../../application/queries/get-store.handler';
import type { Store } from '../../domain/aggregates/store.aggregate';
import {
  AddStoreStaffRequestDto,
  CreateStoreRequestDto,
  SuspendStoreRequestDto,
  UpdateStoreAddressRequestDto,
  UpdateStoreProfileRequestDto,
  UpdateStoreSettingsRequestDto,
} from './dto/store.dto';
import { StoreExceptionFilter } from './filters/store-exception.filter';

@ApiTags('stores')
@Controller('stores')
@ApiBearerAuth()
@UseFilters(StoreExceptionFilter)
export class StoreController {
  constructor(
    private readonly createStore: CreateStoreHandler,
    private readonly lifecycle: StoreLifecycleHandler,
    private readonly updateStore: UpdateStoreHandler,
    private readonly getStore: GetStoreHandler,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft store under an active vendor' })
  async create(@CurrentUser() user: RequestPrincipal, @Body() body: CreateStoreRequestDto) {
    const store = await this.createStore.execute({
      vendorId: body.vendorId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      displayName: body.displayName,
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.currencyCode !== undefined ? { currencyCode: body.currencyCode } : {}),
      ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
      ...(body.locale !== undefined ? { locale: body.locale } : {}),
      ...(body.countryCode !== undefined ? { countryCode: body.countryCode } : {}),
      ...(body.addressLine1 !== undefined ? { addressLine1: body.addressLine1 } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
    });
    return this.toResponse(store);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List stores where the actor is staff' })
  async mine(@CurrentUser() user: RequestPrincipal) {
    const stores = await this.getStore.forActor(user.userId);
    return stores.map((store) => this.toResponse(store));
  }

  @Get()
  @ApiOperation({ summary: 'List stores for a vendor (vendor staff or platform admin)' })
  @ApiQuery({ name: 'vendorId', required: true })
  async listForVendor(@CurrentUser() user: RequestPrincipal, @Query('vendorId') vendorId: string) {
    const stores = await this.getStore.forVendor(vendorId, user.userId, user.roles);
    return stores.map((store) => this.toResponse(store));
  }

  @Get(':storeId')
  @ApiOperation({ summary: 'Get a store by id' })
  async getOne(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    const store = await this.getStore.byId(storeId, user.userId, user.roles);
    return this.toResponse(store);
  }

  @Post(':storeId/activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Activate a draft or suspended store' })
  async activate(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    const store = await this.lifecycle.activate(storeId, user.userId, user.roles);
    return this.toResponse(store);
  }

  @Post(':storeId/suspend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Suspend an active store' })
  async suspend(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: SuspendStoreRequestDto,
  ) {
    const store = await this.lifecycle.suspend(storeId, user.userId, user.roles, body.reason);
    return this.toResponse(store);
  }

  @Post(':storeId/close')
  @HttpCode(200)
  @ApiOperation({ summary: 'Close a store permanently for new sales' })
  async close(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    const store = await this.lifecycle.close(storeId, user.userId, user.roles);
    return this.toResponse(store);
  }

  @Patch(':storeId/profile')
  @ApiOperation({ summary: 'Update store profile' })
  async updateProfile(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: UpdateStoreProfileRequestDto,
  ) {
    const store = await this.updateStore.updateProfile(storeId, user.userId, user.roles, body);
    return this.toResponse(store);
  }

  @Patch(':storeId/address')
  @ApiOperation({ summary: 'Update store address' })
  async updateAddress(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: UpdateStoreAddressRequestDto,
  ) {
    const store = await this.updateStore.updateAddress(storeId, user.userId, user.roles, body);
    return this.toResponse(store);
  }

  @Patch(':storeId/settings')
  @ApiOperation({ summary: 'Update store settings (timezone, currency, locale)' })
  async updateSettings(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: UpdateStoreSettingsRequestDto,
  ) {
    const store = await this.updateStore.updateSettings(storeId, user.userId, user.roles, body);
    return this.toResponse(store);
  }

  @Post(':storeId/staff')
  @HttpCode(200)
  @ApiOperation({ summary: 'Assign store staff' })
  async addStaff(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Body() body: AddStoreStaffRequestDto,
  ) {
    const store = await this.lifecycle.addStaff(
      storeId,
      user.userId,
      user.roles,
      body.userId,
      body.role,
    );
    return this.toResponse(store);
  }

  @Delete(':storeId/staff/:staffUserId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove store staff' })
  async removeStaff(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
    @Param('staffUserId') staffUserId: string,
  ) {
    const store = await this.lifecycle.removeStaff(storeId, user.userId, user.roles, staffUserId);
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
