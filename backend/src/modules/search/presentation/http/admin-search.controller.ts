import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { RequirePermissions } from '../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { SearchReindexHandler } from '../../application/commands/search-reindex.handler';
import { SearchSynonymService } from '../../application/services/search-synonym.service';

class CreateSynonymDto {
  @IsString()
  @MaxLength(256)
  sourceTerm!: string;

  @IsArray()
  @IsString({ each: true })
  targetTerms!: string[];

  @IsOptional()
  @IsBoolean()
  activate?: boolean;
}

class MapZeroResultDto {
  @IsArray()
  @IsString({ each: true })
  targetTerms!: string[];
}

@ApiTags('admin-search')
@Controller('admin/search')
@ApiBearerAuth()
@RequirePermissions('settings.read')
export class AdminSearchController {
  constructor(
    private readonly reindex: SearchReindexHandler,
    private readonly searchSynonyms: SearchSynonymService,
  ) {}

  @Post('reindex')
  @HttpCode(202)
  @RequirePermissions('platform.search.reindex')
  @ApiOperation({
    summary: 'Queue full offer reindex batches (async; does not call Meilisearch inline)',
  })
  async reindexAll(@CurrentUser() user: RequestPrincipal) {
    const result = await this.reindex.enqueueFullReindex(user.roles);
    return {
      status: 'accepted',
      batches: result.batches,
      offerIds: result.offerIds,
    };
  }

  @Get('zero-results')
  @ApiOperation({ summary: 'List zero-result search queries flagged for admin review' })
  async listZeroResults(@Query('all') all?: string) {
    const rows = await this.searchSynonyms.listZeroResultQueries(all !== 'true');
    return { items: rows };
  }

  @Get('synonyms')
  @ApiOperation({ summary: 'List search synonym mappings' })
  async listSynonyms() {
    const items = await this.searchSynonyms.listSynonyms();
    return { items };
  }

  @Post('synonyms')
  @HttpCode(200)
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Create or update a search synonym mapping' })
  async createSynonym(@Body() body: CreateSynonymDto) {
    const item = await this.searchSynonyms.createSynonym(body);
    return { item };
  }

  @Post('synonyms/:id/activate')
  @HttpCode(200)
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Activate a pending synonym and push to Meilisearch' })
  async activateSynonym(@Param('id') id: string) {
    const item = await this.searchSynonyms.activateSynonym(id);
    return { item };
  }

  @Post('zero-results/:id/map')
  @HttpCode(200)
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Map a flagged zero-result query to semantic target terms' })
  async mapZeroResult(@Param('id') id: string, @Body() body: MapZeroResultDto) {
    const result = await this.searchSynonyms.mapZeroResultToSynonym(id, body.targetTerms);
    return result;
  }

  @Post('synonyms/sync')
  @HttpCode(202)
  @RequirePermissions('settings.write')
  @ApiOperation({ summary: 'Push active synonym mappings to Meilisearch' })
  async syncSynonyms() {
    await this.searchSynonyms.pushSynonymsToMeilisearch();
    return { status: 'accepted' };
  }
}
