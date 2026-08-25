import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type RequestPrincipal,
} from '../../../../shared-kernel/presentation/http/current-user.decorator';
import { SearchReindexHandler } from '../../application/commands/search-reindex.handler';

@ApiTags('admin-search')
@Controller('admin/search')
@ApiBearerAuth()
export class AdminSearchController {
  constructor(private readonly reindex: SearchReindexHandler) {}

  @Post('reindex')
  @HttpCode(202)
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
}
