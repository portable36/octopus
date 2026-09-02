import { Body, Controller, Get, HttpCode, Inject, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import type { SeoOverrideEntityType } from '../../domain/seo-override.types';
import type { RedirectStatusCode } from '../../domain/seo.types';
import { SeoAdminService } from '../../application/services/seo-admin.service';

class UpsertSeoOverrideDto {
  @IsIn(['product', 'category', 'cms'])
  entityType!: SeoOverrideEntityType;

  @IsUUID()
  entityId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  noindex?: boolean | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  canonicalUrl?: string | null;
}

class RedirectRuleDto {
  @IsString()
  @MaxLength(2048)
  sourcePath!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  targetPath?: string | null;

  @IsIn([301, 302, 410])
  statusCode!: RedirectStatusCode;
}

class ManageRedirectsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => RedirectRuleDto)
  redirect?: RedirectRuleDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RedirectRuleDto)
  redirects?: RedirectRuleDto[];
}

class PatchSystemSettingsDto {
  @IsObject()
  settings!: Record<string, unknown>;
}

@ApiTags('admin-seo')
@Controller('admin/seo')
@ApiBearerAuth()
@RequirePermissions('settings.read')
export class SeoAdminController {
  constructor(@Inject(SeoAdminService) private readonly seoAdmin: SeoAdminService) {}

  @Get('health')
  @ApiOperation({ summary: 'SEO health metrics and job synchronization status' })
  async health() {
    return this.seoAdmin.getHealth();
  }

  @Get('settings')
  @ApiOperation({ summary: 'List platform SEO / analytics system settings' })
  async listSettings() {
    const settings = await this.seoAdmin.listSystemSettings();
    return { settings };
  }

  @Patch('settings')
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Update platform SEO / analytics system settings (admin only)' })
  async patchSettings(@Body() body: PatchSystemSettingsDto) {
    return this.seoAdmin.updateSystemSettings(body.settings);
  }

  @Post('overrides')
  @HttpCode(200)
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Create or update SEO metadata override for an entity' })
  async upsertOverride(@Body() body: UpsertSeoOverrideDto) {
    const saved = await this.seoAdmin.saveOverride(body);
    return { entityType: body.entityType, entityId: body.entityId, override: saved };
  }

  @Post('redirects')
  @HttpCode(200)
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Create, update, or bulk-import redirect rules' })
  async manageRedirects(@Body() body: ManageRedirectsDto) {
    const items = body.redirects ?? (body.redirect ? [body.redirect] : []);
    if (items.length === 0) {
      return { count: 0 };
    }
    return this.seoAdmin.saveRedirects(
      items.map((entry) => ({
        sourcePath: entry.sourcePath,
        targetPath: entry.targetPath ?? null,
        statusCode: entry.statusCode,
      })),
    );
  }

  @Post('jobs/sitemap')
  @HttpCode(202)
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Enqueue sitemap cache regeneration' })
  async refreshSitemap() {
    await this.seoAdmin.enqueueSitemapRefresh();
    return { status: 'accepted' };
  }

  @Post('jobs/product-feeds')
  @HttpCode(202)
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Enqueue product feed regeneration' })
  async refreshProductFeeds() {
    await this.seoAdmin.enqueueProductFeedRefresh();
    return { status: 'accepted' };
  }

  @Post('jobs/verify-health')
  @HttpCode(202)
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Enqueue low-priority SEO health verification crawl' })
  async verifyHealth() {
    await this.seoAdmin.enqueueVerifySeoHealth();
    return { status: 'accepted' };
  }

  @Get('crawl-errors')
  @ApiOperation({ summary: 'Recent crawl/404 error paths logged for admin review' })
  async listCrawlErrors() {
    const items = await this.seoAdmin.listCrawlErrors();
    return { items };
  }

  @Get('health-issues')
  @ApiOperation({ summary: 'Latest SEO health verification findings' })
  async listHealthIssues() {
    const items = await this.seoAdmin.listSeoHealthIssues();
    return { items };
  }
}
