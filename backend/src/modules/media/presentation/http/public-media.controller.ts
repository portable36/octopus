import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppConfigService } from '../../../../config/app-config.service';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../../application/ports/media-repository.interface';

@ApiTags('public-media')
@Controller('public/media')
export class PublicMediaController {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: MediaRepository,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Get(':mediaId')
  @ApiOperation({ summary: 'Public thumbnail URL for an image media asset' })
  async getPublicUrl(@Param('mediaId') mediaId: string) {
    const asset = await this.media.findById(mediaId);
    if (!asset || !asset.contentType.startsWith('image/')) {
      throw new NotFoundException({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Media not found.',
        code: 'MEDIA_NOT_FOUND',
      });
    }
    const base = this.config.mediaPublicBaseUrl.replace(/\/$/, '');
    const key = asset.storageKey.replace(/^\//, '');
    return {
      id: asset.id,
      contentType: asset.contentType,
      url: `${base}/${key}`,
    };
  }
}
