import { Inject, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { AppConfigService } from '../../../../config/app-config.service';
import {
  SITEMAP_SOURCE,
  type SitemapSourcePort,
} from '../ports/sitemap-source.port';
import { SitemapCacheService } from './sitemap-cache.service';
import { SystemSettingsRuntimeBridge } from './system-settings-runtime.bridge';
import { renderSitemapUrl } from './sitemap-xml.renderer';

@Injectable()
export class SitemapStreamService {
  constructor(
    @Inject(SITEMAP_SOURCE) private readonly source: SitemapSourcePort,
    private readonly cache: SitemapCacheService,
    private readonly config: AppConfigService,
    private readonly runtimeSettings: SystemSettingsRuntimeBridge,
  ) {}

  public async pipeXml(response: Response, batchSize?: number): Promise<void> {
    const chunkSize = batchSize ?? (await this.runtimeSettings.resolveSitemapItemsPerChunk());
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', `public, max-age=${this.config.seoCacheTtlSeconds}`);

    const cached = this.cache.getCachedBuffer() ?? (await this.cache.loadFromDisk());
    if (cached) {
      response.end(cached);
      return;
    }

    response.write('<?xml version="1.0" encoding="UTF-8"?>\n');
    response.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n');

    for await (const batch of this.source.streamEntries(chunkSize)) {
      for (const entry of batch) {
        response.write(renderSitemapUrl(entry));
      }
    }

    response.write('</urlset>\n');
    response.end();
  }
}
