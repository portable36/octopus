import { Controller, Get, Param, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { GetVendorHandler } from '../../application/queries/get-vendor.handler';
import type { Vendor } from '../../domain/aggregates/vendor.aggregate';
import { VendorExceptionFilter } from './filters/vendor-exception.filter';

@ApiTags('admin-vendors')
@Controller('admin/vendors')
@ApiBearerAuth()
@UseFilters(VendorExceptionFilter)
export class AdminVendorController {
  constructor(private readonly getVendor: GetVendorHandler) {}

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
