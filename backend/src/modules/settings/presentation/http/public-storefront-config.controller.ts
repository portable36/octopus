import { BadRequestException, Controller, Get, Query, UseFilters } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import { SettingsHandlers } from '../../application/commands/settings.handlers';
import type {
  BrandingSettings,
  ConfigurationScope,
  GeneralSettings,
  MarketingSettings,
} from '../../domain/settings.types';
import { SettingsExceptionFilter } from './filters/settings-exception.filter';
import { toStorefrontPublicConfig } from './storefront-public-config';

@ApiTags('storefront-config')
@Controller('storefront')
@UseFilters(SettingsExceptionFilter)
export class PublicStorefrontConfigController {
  constructor(private readonly settings: SettingsHandlers) {}

  @Public()
  @Get('config')
  @ApiOperation({
    summary:
      'Effective storefront config (general + branding + public marketing; Platform→Vendor→Store)',
  })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'storeId', required: false })
  async getConfig(@Query('vendorId') vendorId?: string, @Query('storeId') storeId?: string) {
    const scope = resolvePublicScope(vendorId, storeId);
    const [general, branding, marketing] = await Promise.all([
      this.settings.getEffectivePublic('general', scope) as Promise<GeneralSettings>,
      this.settings.getEffectivePublic('branding', scope) as Promise<BrandingSettings>,
      this.settings.getEffectivePublic('marketing', scope) as Promise<MarketingSettings>,
    ]);

    return toStorefrontPublicConfig({ scope, general, branding, marketing });
  }
}

function resolvePublicScope(vendorId?: string, storeId?: string): ConfigurationScope {
  if (storeId && !vendorId) {
    throw new BadRequestException('storeId requires vendorId.');
  }
  if (storeId && vendorId) {
    return { kind: 'store', vendorId, storeId };
  }
  if (vendorId) {
    return { kind: 'vendor', vendorId };
  }
  return { kind: 'platform' };
}
