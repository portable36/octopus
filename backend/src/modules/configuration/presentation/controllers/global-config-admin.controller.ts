import { Body, Controller, Get, Inject, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { GlobalConfigService } from '../../application/services/global-config.service';

class PatchGlobalConfigDto {
  @IsObject()
  settings!: Record<string, Record<string, unknown>>;
}

@ApiTags('admin-config')
@Controller('admin/config')
@ApiBearerAuth()
@RequirePermissions('settings.read')
export class GlobalConfigAdminController {
  constructor(@Inject(GlobalConfigService) private readonly globalConfig: GlobalConfigService) {}

  @Get()
  @ApiOperation({ summary: 'List all platform global settings grouped by category' })
  async listAll() {
    const settings = await this.globalConfig.listGrouped();
    return { settings };
  }

  @Patch()
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Bulk update global platform settings (admin only)' })
  async patch(@Body() body: PatchGlobalConfigDto) {
    return this.globalConfig.bulkUpdate(body.settings);
  }
}
