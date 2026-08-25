import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { CustomerHandlers } from '../../application/commands/customer.handlers';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;
}

class AddressDto {
  @IsString()
  @MaxLength(80)
  label!: string;

  @IsString()
  @MaxLength(200)
  recipientName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsString()
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string | null;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  postalCode?: string | null;

  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

class PatchAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  postalCode?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@ApiTags('customer')
@Controller('customer')
@ApiBearerAuth()
export class CustomerController {
  constructor(private readonly customers: CustomerHandlers) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get or create the current customer profile' })
  async getProfile(@CurrentUser() user: RequestPrincipal) {
    const profile = await this.customers.getOrCreateProfile(
      user.userId,
      user.email.split('@')[0] || 'Customer',
    );
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      phone: profile.phone,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update customer profile' })
  async updateProfile(@CurrentUser() user: RequestPrincipal, @Body() body: UpdateProfileDto) {
    const profile = await this.customers.updateProfile(user.userId, {
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
    });
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      phone: profile.phone,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  @Get('addresses')
  @ApiOperation({ summary: 'List address book' })
  async listAddresses(@CurrentUser() user: RequestPrincipal) {
    const addresses = await this.customers.listAddresses(user.userId);
    return addresses.map(addressResponse);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add address' })
  async addAddress(@CurrentUser() user: RequestPrincipal, @Body() body: AddressDto) {
    const address = await this.customers.addAddress(user.userId, body);
    return addressResponse(address);
  }

  @Patch('addresses/:addressId')
  @ApiOperation({ summary: 'Update address' })
  async updateAddress(
    @CurrentUser() user: RequestPrincipal,
    @Param('addressId') addressId: string,
    @Body() body: PatchAddressDto,
  ) {
    const address = await this.customers.updateAddress(user.userId, addressId, body);
    return addressResponse(address);
  }

  @Delete('addresses/:addressId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete address' })
  async deleteAddress(
    @CurrentUser() user: RequestPrincipal,
    @Param('addressId') addressId: string,
  ) {
    await this.customers.deleteAddress(user.userId, addressId);
  }
}

function addressResponse(address: {
  id: string;
  label: string;
  recipientName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefault: boolean;
  updatedAt: Date;
}) {
  return {
    id: address.id,
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    region: address.region,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
    isDefault: address.isDefault,
    updatedAt: address.updatedAt.toISOString(),
  };
}
