import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { AppConfigService } from '../../../../config/app-config.service';
import { ImageSitemapCacheService } from './image-sitemap-cache.service';
import { URLSET_CLOSE, URLSET_OPEN } from '../../sitemap/image-sitemap.generator';

const EMPTY_IMAGE_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>\n${URLSET_OPEN}${URLSET_CLOSE}`;

@Injectable()
export class ImageSitemapDeliveryService {
  constructor(
    private readonly cache: ImageSitemapCacheService,
    private readonly config: AppConfigService,
  ) {}

  public async serveCachedXml(response: Response): Promise<void> {
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', `public, max-age=${this.config.seoCacheTtlSeconds}`);

    const cached = this.cache.getCachedBuffer() ?? (await this.cache.loadFromDisk());
    response.end(cached ?? Buffer.from(EMPTY_IMAGE_SITEMAP, 'utf8'));
  }
}
