import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsObject, IsOptional, Max, Min } from 'class-validator';
import {
  COURIER_PORT,
  type CourierPort,
} from '../../../../shared-kernel/application/ports/courier.port';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import type { CourierProvider } from '../../domain/fulfillment.types';
import { CourierProviderError, FulfillmentValidationError } from '../../application/errors/fulfillment.errors';
import { FulfillmentAuthorizationService } from '../../application/services/fulfillment-authorization.service';
import {
  COURIER_ACCOUNT_ADMIN_PORT,
  type CourierAccountAdminPort,
} from '../../application/ports/courier-account-admin.port';
import { FulfillmentExceptionFilter } from './filters/fulfillment-exception.filter';

class UpsertCourierAccountDto {
  @IsIn(['STEADFAST', 'PATHAO'])
  provider!: 'STEADFAST' | 'PATHAO';

  @IsObject()
  credentials!: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  pathaoStoreId?: number;
}

class QuoteCourierDeliveryDto {
  @IsIn(['PATHAO', 'STEADFAST', 'MANUAL'])
  provider!: 'PATHAO' | 'STEADFAST' | 'MANUAL';

  @IsNumber()
  @Min(0.5)
  @Max(10)
  weightKg!: number;

  @IsInt()
  @Min(1)
  recipientCityId!: number;

  @IsInt()
  @Min(1)
  recipientZoneId!: number;

  @IsOptional()
  @IsInt()
  @IsIn([12, 48])
  deliveryType?: number;

  @IsOptional()
  @IsInt()
  @IsIn([1, 2])
  itemType?: number;
}

@ApiTags('fulfillment-courier-accounts')
@Controller('fulfillment/vendors/:vendorId/courier-accounts')
@ApiBearerAuth()
@UseFilters(FulfillmentExceptionFilter)
export class CourierAccountsController {
  constructor(
    @Inject(COURIER_ACCOUNT_ADMIN_PORT) private readonly accounts: CourierAccountAdminPort,
    @Inject(COURIER_PORT) private readonly courier: CourierPort,
    @Inject(FulfillmentAuthorizationService)
    private readonly authz: FulfillmentAuthorizationService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List courier account readiness for a vendor (no secrets)',
  })
  async list(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
  ): Promise<
    readonly {
      provider: CourierProvider;
      configured: boolean;
      isActive: boolean;
      pathaoStoreId: number | null;
      updatedAt: string | null;
    }[]
  > {
    await this.authz.requireVendorMember(vendorId, user.userId, user.roles);
    return this.accounts.listAccountStatus(vendorId);
  }

  @Put()
  @HttpCode(200)
  @ApiOperation({ summary: 'Upsert encrypted courier credentials for STEADFAST or PATHAO' })
  async upsert(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: UpsertCourierAccountDto,
  ): Promise<{ ok: true; provider: string }> {
    await this.authz.requireVendorMember(vendorId, user.userId, user.roles);
    await this.accounts.upsertAccount({
      vendorId,
      provider: body.provider,
      credentials: body.credentials,
      ...(body.pathaoStoreId !== undefined ? { pathaoStoreId: body.pathaoStoreId } : {}),
    });
    return { ok: true, provider: body.provider };
  }

  @Get('pathao/cities')
  @ApiOperation({ summary: 'List Pathao cities for price-plan quotes' })
  async listPathaoCities(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
  ) {
    await this.authz.requireVendorMember(vendorId, user.userId, user.roles);
    try {
      return await this.courier.listQuoteCities({ vendorId, provider: 'PATHAO' });
    } catch (error) {
      if (error instanceof CourierProviderError) {
        throw new FulfillmentValidationError(error.message);
      }
      throw error;
    }
  }

  @Get('pathao/cities/:cityId/zones')
  @ApiOperation({ summary: 'List Pathao zones for a city (price-plan quotes)' })
  async listPathaoZones(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Param('cityId', ParseIntPipe) cityId: number,
  ) {
    await this.authz.requireVendorMember(vendorId, user.userId, user.roles);
    try {
      return await this.courier.listQuoteZones({ vendorId, provider: 'PATHAO', cityId });
    } catch (error) {
      if (error instanceof CourierProviderError) {
        throw new FulfillmentValidationError(error.message);
      }
      throw error;
    }
  }

  @Post('quote')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Quote delivery fee (Pathao merchant price-plan; Steadfast unsupported)',
  })
  async quote(
    @CurrentUser() user: RequestPrincipal,
    @Param('vendorId') vendorId: string,
    @Body() body: QuoteCourierDeliveryDto,
  ) {
    await this.authz.requireVendorMember(vendorId, user.userId, user.roles);
    try {
      return await this.courier.quoteDelivery({
        vendorId,
        provider: body.provider,
        weightKg: body.weightKg,
        recipientCityId: body.recipientCityId,
        recipientZoneId: body.recipientZoneId,
        ...(body.deliveryType !== undefined ? { deliveryType: body.deliveryType } : {}),
        ...(body.itemType !== undefined ? { itemType: body.itemType } : {}),
      });
    } catch (error) {
      if (error instanceof CourierProviderError) {
        throw new FulfillmentValidationError(error.message);
      }
      throw error;
    }
  }
}
