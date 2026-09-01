import { Body, Controller, Get, Param, Post, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { RegisterVendorHandler } from '../../application/commands/register-vendor.handler';
import { GetVendorHandler } from '../../application/queries/get-vendor.handler';
import type { Vendor } from '../../domain/aggregates/vendor.aggregate';
import { AdminRegisterVendorRequestDto } from './dto/vendor.dto';
import { VendorExceptionFilter } from './filters/vendor-exception.filter';

@ApiTags('admin-vendors')
@Controller('admin/vendors')
@ApiBearerAuth()
@RequirePermissions('platform.vendors.read')
@UseFilters(VendorExceptionFilter)
export class AdminVendorController {
  constructor(
    private readonly getVendor: GetVendorHandler,
    private readonly registerVendor: RegisterVendorHandler,
  ) {}

  @Post()
  @RequirePermissions('platform.vendors.write')
  @ApiOperation({ summary: 'Platform admin: create a pending vendor for an existing user' })
  async create(@CurrentUser() user: RequestPrincipal, @Body() body: AdminRegisterVendorRequestDto) {
    const vendor = await this.registerVendor.createForPlatformAdmin({
      actorUserId: user.userId,
      actorRoles: user.roles,
      ownerUserId: body.ownerUserId,
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

  @Get()
  @ApiOperation({ summary: 'Platform admin: list all vendors (read)' })
  async list(@CurrentUser() user: RequestPrincipal) {
    const vendors = await this.getVendor.listAllForPlatform(user.roles);
    return vendors.map((vendor) => this.toResponse(vendor));
  }

  @Get(':vendorId')
  @ApiOperation({ summary: 'Platform admin: get vendor by id' })
  async getOne(@CurrentUser() user: RequestPrincipal, @Param('vendorId') vendorId: string) {
    const vendor = await this.getVendor.byId(vendorId, user.userId, user.roles);
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
