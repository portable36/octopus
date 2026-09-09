import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import { MediaHandlers } from '../../application/commands/media.handlers';

@ApiTags('public-media')
@Controller('public/media')
export class PublicMediaController {
  constructor(private readonly media: MediaHandlers) {}

  @Public()
  @Get(':mediaId')
  @ApiOperation({
    summary:
      'Public image URL for a media asset (CDN base when configured; otherwise short-lived signed GET)',
  })
  async getPublicUrl(@Param('mediaId') mediaId: string) {
    const resolved = await this.media.resolveImageDownloadUrl(mediaId);
    if (!resolved) {
      throw new NotFoundException({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Media not found.',
        code: 'MEDIA_NOT_FOUND',
      });
    }
    return resolved;
  }
}
