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
import {
  CreateStoreDraftHandler,
  GetStoreDraftHandler,
  SubmitStoreDraftHandler,
  UpdateStoreDraftHandler,
  ValidateStoreDraftHandler,
} from '../../application/commands/store-onboarding.handlers';
import { RetryProvisioningHandler } from '../../application/commands/retry-provisioning.handler';
import { StoreLifecycleHandler } from '../../application/commands/store-lifecycle.handler';
import { UpdateStoreHandler } from '../../application/commands/update-store.handler';
import { GetProvisioningStatusHandler } from '../../application/queries/get-provisioning-status.handler';
import { GetStoreHandler } from '../../application/queries/get-store.handler';
import type { Store } from '../../domain/aggregates/store.aggregate';
import type {
  StoreOnboardingDraftRecord,
  StoreWizardPayload,
  StoreWizardStep,
} from '../../domain/store-onboarding.types';
import { normalizeStoreStatusForResponse } from '../../domain/store.types';
import {
  AddStoreStaffRequestDto,
  CreateStoreDraftRequestDto,
  CreateStoreRequestDto,
  MaintenanceStoreRequestDto,
  SuspendStoreRequestDto,
  UpdateStoreAddressRequestDto,
  UpdateStoreDraftRequestDto,
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
    private readonly createStoreDraft: CreateStoreDraftHandler,
    private readonly getStoreDraft: GetStoreDraftHandler,
    private readonly updateStoreDraft: UpdateStoreDraftHandler,
    private readonly validateStoreDraft: ValidateStoreDraftHandler,
    private readonly submitStoreDraft: SubmitStoreDraftHandler,
    private readonly getProvisioningStatus: GetProvisioningStatusHandler,
    private readonly retryProvisioning: RetryProvisioningHandler,
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

  @Post('drafts')
  @ApiOperation({ summary: 'Create a store onboarding wizard draft' })
  async createDraft(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateStoreDraftRequestDto,
  ) {
    const draft = await this.createStoreDraft.execute({
      vendorId: body.vendorId,
      actorUserId: user.userId,
      actorRoles: user.roles,
    });
    return this.toDraftResponse(draft);
  }

  @Get('drafts/:draftId')
  @ApiOperation({ summary: 'Get a store onboarding draft' })
  async getDraft(@CurrentUser() user: RequestPrincipal, @Param('draftId') draftId: string) {
    const draft = await this.getStoreDraft.execute(draftId, user.userId, user.roles);
    return this.toDraftResponse(draft);
  }

  @Patch('drafts/:draftId')
  @ApiOperation({ summary: 'Update a store onboarding draft' })
  async patchDraft(
    @CurrentUser() user: RequestPrincipal,
    @Param('draftId') draftId: string,
    @Body() body: UpdateStoreDraftRequestDto,
  ) {
    const draft = await this.updateStoreDraft.execute({
      draftId,
      actorUserId: user.userId,
      actorRoles: user.roles,
      ...(body.currentStep !== undefined
        ? { currentStep: body.currentStep as StoreWizardStep }
        : {}),
      ...(body.payload !== undefined ? { payload: body.payload as StoreWizardPayload } : {}),
    });
    return this.toDraftResponse(draft);
  }

  @Post('drafts/:draftId/validate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Validate a store onboarding draft' })
  async validateDraft(@CurrentUser() user: RequestPrincipal, @Param('draftId') draftId: string) {
    return this.validateStoreDraft.execute(draftId, user.userId, user.roles);
  }

  @Post('drafts/:draftId/submit')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit draft and start store provisioning' })
  async submitDraft(@CurrentUser() user: RequestPrincipal, @Param('draftId') draftId: string) {
    const result = await this.submitStoreDraft.execute(draftId, user.userId, user.roles);
    return {
      storeId: result.storeId,
      draft: this.toDraftResponse(result.draft),
    };
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

  @Get(':storeId/provisioning')
  @ApiOperation({ summary: 'Get store provisioning status' })
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
  @ApiOperation({ summary: 'Retry failed store provisioning' })
  async retryProvisioningRoute(
    @CurrentUser() user: RequestPrincipal,
    @Param('storeId') storeId: string,
  ) {
    await this.retryProvisioning.execute(storeId, user.userId, user.roles);
    return { ok: true };
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

  @Post(':storeId/maintenance')
  @HttpCode(200)
  @ApiOperation({ summary: 'Put an active store into maintenance mode' })
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
  @ApiOperation({ summary: 'Archive a store' })
  async archive(@CurrentUser() user: RequestPrincipal, @Param('storeId') storeId: string) {
    const store = await this.lifecycle.archive(storeId, user.userId, user.roles);
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
      storeCode: store.storeCode,
      storeType: store.storeType,
      ownershipKind: store.ownershipKind,
      status: normalizeStoreStatusForResponse(store.status),
      profile: store.profile,
      contact: store.contact,
      address: store.address,
      openingHours: store.openingHours,
      settings: store.settings,
      staff: store.staff.map((member) => ({
        userId: member.userId,
        role: member.role,
        addedAt: member.addedAt.toISOString(),
      })),
    };
  }

  private toDraftResponse(draft: StoreOnboardingDraftRecord) {
    return {
      id: draft.id,
      vendorId: draft.vendorId,
      storeId: draft.storeId,
      currentStep: draft.currentStep,
      payload: draft.payload,
      status: draft.status,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    };
  }
}
