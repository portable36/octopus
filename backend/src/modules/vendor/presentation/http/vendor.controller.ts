import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { RegisterVendorHandler } from '../../application/commands/register-vendor.handler';
import { UpdateVendorHandler } from '../../application/commands/update-vendor.handler';
import { VendorLifecycleHandler } from '../../application/commands/vendor-lifecycle.handler';
import { GetVendorHandler } from '../../application/queries/get-vendor.handler';
import type { Vendor } from '../../domain/aggregates/vendor.aggregate';
import {
  AddVendorStaffRequestDto,
  RegisterVendorRequestDto,
  RejectVendorRequestDto,
  SuspendVendorRequestDto,
  UpdateVendorProfileRequestDto,
  UpdateVendorSettingsRequestDto,
} from './dto/vendor.dto';
import { VendorExceptionFilter } from './filters/vendor-exception.filter';

@ApiTags('vendors')
@Controller('vendors')
@ApiBearerAuth()
@UseFilters(VendorExceptionFilter)
export class VendorController {
  constructor(
    private readonly registerVendor: RegisterVendorHandler,
    private readonly lifecycle: VendorLifecycleHandler,
    private readonly updateVendor: UpdateVendorHandler,
    private readonly getVendor: GetVendorHandler,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register a new vendor (owner = authenticated user)' })
  async register(@CurrentUser() user: RequestPrincipal, @Body() body: RegisterVendorRequestDto) {
    const vendor = await this.registerVendor.execute({
      actorUserId: user.userId,
      actorRoles: user.roles,
      displayName: body.displayName,
      legalName: body.legalName,
      contactEmail: body.contactEmail,
      ...(body.countryCode !== undefined ? { countryCode: body.countryCode } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.registrationNumber !== undefined
        ? { registrationNumber: body.registrationNumber }
        : {}),
      ...(body.taxId !== undefined ? { taxId: body.taxId } : {}),
    });
    return this.toResponse(vendor);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List vendors where the actor is staff' })
  async mine(@CurrentUser() user: RequestPrincipal) {
    const vendors = await this.getVendor.forActor(user.userId);
    return vendors.map((vendor) => this.toResponse(vendor));
  }

  @Get(':vendorId')
  @ApiOperation({ summary: 'Get a vendor by id (staff or platform admin)' })
  async getOne(@CurrentUser() user: RequestPrincipal, @Param('vendorId') vendorId: string) {
    const vendor = await this.getVendor.byId(vendorId, user.userId, user.roles);
    return this.toResponse(vendor);
  }

  @Post(':vendorId/submit-review')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit vendor for platform review' })
  async submitReview(@CurrentUser() user: RequestPrincipal, @Param('vendorId') vendorId: string) {
    const vendor = await this.lifecycle.submitForReview(vendorId, user.userId, user.roles);
    return this.toResponse(vendor);
  }

  @Post(':vendorId/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Platform admin: approve vendor' })
  async approve(@CurrentUser() user: RequestPrincipal, @Param('vendorId') vendorId: string) {
    const vendor = await this.lifecycle.approve(vendorId, user.userId, user.roles);
    return this.toResponse(vendor);
  }

  @Post(':vendorId/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Platform admin: reject vendor' })
  async reject(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: RejectVendorRequestDto,
  ) {
    const vendor = await this.lifecycle.reject(vendorId, user.userId, user.roles, body.reason);
    return this.toResponse(vendor);
  }

  @Post(':vendorId/activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Activate an approved or suspended vendor' })
  async activate(@CurrentUser() user: RequestPrincipal, @Param('vendorId') vendorId: string) {
    const vendor = await this.lifecycle.activate(vendorId, user.userId, user.roles);
    return this.toResponse(vendor);
  }

  @Post(':vendorId/suspend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Suspend an active or approved vendor' })
  async suspend(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: SuspendVendorRequestDto,
  ) {
    const vendor = await this.lifecycle.suspend(vendorId, user.userId, user.roles, body.reason);
    return this.toResponse(vendor);
  }

  @Post(':vendorId/reopen')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reopen a rejected vendor for rework' })
  async reopen(@CurrentUser() user: RequestPrincipal, @Param('vendorId') vendorId: string) {
    const vendor = await this.lifecycle.reopen(vendorId, user.userId);
    return this.toResponse(vendor);
  }

  @Patch(':vendorId/profile')
  @ApiOperation({ summary: 'Update vendor profile (owner)' })
  async updateProfile(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: UpdateVendorProfileRequestDto,
  ) {
    const vendor = await this.updateVendor.updateProfile(vendorId, user.userId, user.roles, body);
    return this.toResponse(vendor);
  }

  @Patch(':vendorId/settings')
  @ApiOperation({ summary: 'Update vendor settings (owner)' })
  async updateSettings(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: UpdateVendorSettingsRequestDto,
  ) {
    const vendor = await this.updateVendor.updateSettings(vendorId, user.userId, user.roles, body);
    return this.toResponse(vendor);
  }

  @Post(':vendorId/staff')
  @HttpCode(200)
  @ApiOperation({ summary: 'Add vendor staff (owner or platform admin)' })
  async addStaff(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: AddVendorStaffRequestDto,
  ) {
    const vendor = await this.lifecycle.addStaff(
      vendorId,
      user.userId,
      user.roles,
      body.userId,
      body.role,
    );
    return this.toResponse(vendor);
  }

  @Delete(':vendorId/staff/:staffUserId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove vendor staff (owner or platform admin)' })
  async removeStaff(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Param('staffUserId') staffUserId: string,
  ) {
    const vendor = await this.lifecycle.removeStaff(vendorId, user.userId, user.roles, staffUserId);
    return this.toResponse(vendor);
  }

  private toResponse(vendor: Vendor) {
    return {
      id: vendor.id.value,
      status: vendor.status,
      profile: vendor.profile,
      business: vendor.business,
      contact: vendor.contact,
      settings: vendor.settings,
      ownerUserId: vendor.ownerUserId,
      rejectionReason: vendor.rejectionReason,
      staff: vendor.staff.map((member) => ({
        userId: member.userId,
        role: member.role,
        addedAt: member.addedAt.toISOString(),
      })),
    };
  }
}
