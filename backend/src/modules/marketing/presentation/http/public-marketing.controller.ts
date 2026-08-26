import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  MARKETING_SETTINGS_PORT,
  type MarketingSettingsPort,
} from '../../../../shared-kernel/application/ports/marketing-settings.port';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';

@ApiTags('public-marketing')
@Controller('public/marketing')
export class PublicMarketingController {
  constructor(
    @Inject(MARKETING_SETTINGS_PORT) private readonly marketingSettings: MarketingSettingsPort,
  ) {}

  @Public()
  @Get('config')
  @ApiOperation({
    summary: 'Public marketing config (GTM/GA4/Pixel IDs only; never secrets)',
  })
  getConfig() {
    return this.marketingSettings.getPublic();
  }
}
