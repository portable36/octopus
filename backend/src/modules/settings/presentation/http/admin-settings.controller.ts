import { Body, Controller, Get, Patch, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsUUID } from 'class-validator';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { tryGetTenantContext } from '../../../../shared-kernel/infrastructure/context/tenant-context.storage';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { SettingsHandlers } from '../../application/commands/settings.handlers';
import { SettingsAccessDeniedError } from '../../application/errors/settings.errors';
import type { ConfigurationKey, ConfigurationScope } from '../../domain/settings.types';
import { SettingsExceptionFilter } from './filters/settings-exception.filter';

/** Mirrors identity grants for settings.read / settings.write. */
const SETTINGS_READ_ROLES = new Set([
  'PLATFORM_ADMIN',
  'VENDOR_OWNER',
  'VENDOR_STAFF',
  'STORE_MANAGER',
  'STORE_STAFF',
]);
const SETTINGS_WRITE_ROLES = new Set(['PLATFORM_ADMIN', 'VENDOR_OWNER', 'STORE_MANAGER']);

class UpsertSettingsDto {
  @IsIn(['general', 'branding', 'marketing'])
  key!: ConfigurationKey;

  @IsIn(['platform', 'vendor', 'store'])
  scopeKind!: 'platform' | 'vendor' | 'store';

  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

function resolveScopeFromRequest(input: {
  scopeKind: 'platform' | 'vendor' | 'store';
  vendorId?: string;
  storeId?: string;
}): ConfigurationScope {
  const ctx = tryGetTenantContext();
  if (input.scopeKind === 'platform') {
    return { kind: 'platform' };
  }
  if (input.scopeKind === 'vendor') {
    const vendorId = ctx?.vendorId ?? input.vendorId;
    if (!vendorId) {
      throw new SettingsAccessDeniedError('Vendor scope requires an active vendor context.');
    }
    return { kind: 'vendor', vendorId };
  }
  const vendorId = ctx?.vendorId ?? input.vendorId;
  const storeId = ctx?.storeId ?? input.storeId;
  if (!vendorId || !storeId) {
    throw new SettingsAccessDeniedError('Store scope requires vendor and store context.');
  }
  return { kind: 'store', vendorId, storeId };
}

function assertSettingsRead(roles: readonly string[]): void {
  if (!roles.some((role) => SETTINGS_READ_ROLES.has(role))) {
    throw new SettingsAccessDeniedError('Missing permission settings.read.');
  }
}

function assertSettingsWrite(roles: readonly string[]): void {
  if (!roles.some((role) => SETTINGS_WRITE_ROLES.has(role))) {
    throw new SettingsAccessDeniedError('Missing permission settings.write.');
  }
}

@ApiTags('admin-settings')
@Controller('admin/settings')
@ApiBearerAuth()
@UseFilters(SettingsExceptionFilter)
export class AdminSettingsController {
  constructor(private readonly settings: SettingsHandlers) {}

  @Get('effective')
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'Resolve effective settings with Platform→Vendor→Store inheritance' })
  @ApiQuery({ name: 'key', required: true, enum: ['general', 'branding', 'marketing'] })
  @ApiQuery({ name: 'scopeKind', required: true, enum: ['platform', 'vendor', 'store'] })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'storeId', required: false })
  async effective(
    @CurrentUser() user: RequestPrincipal,
    @Query('key') key: ConfigurationKey,
    @Query('scopeKind') scopeKind: 'platform' | 'vendor' | 'store',
    @Query('vendorId') vendorId?: string,
    @Query('storeId') storeId?: string,
  ) {
    assertSettingsRead(user.roles);
    const scope = resolveScopeFromRequest({
      scopeKind,
      ...(vendorId ? { vendorId } : {}),
      ...(storeId ? { storeId } : {}),
    });
    const ctx = tryGetTenantContext();
    const value = await this.settings.getEffective({
      key,
      scope,
      actorRoles: user.roles,
      actorVendorId: ctx?.vendorId ?? null,
      actorStoreIds: ctx?.storeId ? [ctx.storeId] : [],
    });
    return { key, scope, value };
  }

  @Patch()
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Upsert a typed configuration document at a scope' })
  async upsert(@CurrentUser() user: RequestPrincipal, @Body() body: UpsertSettingsDto) {
    assertSettingsWrite(user.roles);
    const scope = resolveScopeFromRequest({
      scopeKind: body.scopeKind,
      ...(body.vendorId ? { vendorId: body.vendorId } : {}),
      ...(body.storeId ? { storeId: body.storeId } : {}),
    });
    const ctx = tryGetTenantContext();
    const actorStoreIds = ctx?.storeId ? [ctx.storeId] : [];
    const saved = await this.settings.upsert({
      key: body.key,
      scope,
      payload: body.payload,
      actorUserId: user.userId,
      actorRoles: user.roles,
      actorVendorId: ctx?.vendorId ?? null,
      actorStoreIds,
    });
    return saved;
  }
}
