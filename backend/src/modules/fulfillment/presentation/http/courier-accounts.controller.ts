import { Body, Controller, Get, HttpCode, Inject, Param, Put, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, IsOptional, Min } from 'class-validator';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import type { CourierProvider } from '../../domain/fulfillment.types';
import { FulfillmentAuthorizationService } from '../../application/services/fulfillment-authorization.service';
import { CourierAccountStore } from '../../infrastructure/persistence/courier-account.store';
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

@ApiTags('fulfillment-courier-accounts')
@Controller('fulfillment/vendors/:vendorId/courier-accounts')
@ApiBearerAuth()
@UseFilters(FulfillmentExceptionFilter)
export class CourierAccountsController {
  constructor(
    @Inject(CourierAccountStore) private readonly accounts: CourierAccountStore,
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
}